from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# YouTube API Service
def get_youtube_service():
    """Initialize YouTube API service"""
    api_key = os.environ.get('YOUTUBE_API_KEY')
    if not api_key:
        raise HTTPException(
            status_code=500, 
            detail="YouTube API key not configured. Please add YOUTUBE_API_KEY to backend/.env file"
        )
    return build('youtube', 'v3', developerKey=api_key)


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str


class ChannelSearch(BaseModel):
    query: str


class ChannelInfo(BaseModel):
    channel_id: str
    title: str
    description: str
    custom_url: Optional[str] = None
    thumbnail_url: str
    banner_url: Optional[str] = None
    subscriber_count: str
    video_count: str
    view_count: str
    published_at: str


class VideoInfo(BaseModel):
    video_id: str
    title: str
    description: str
    thumbnail_url: str
    published_at: str
    duration: str
    view_count: str
    like_count: str
    comment_count: str


class ChannelSearchResult(BaseModel):
    channel_id: str
    title: str
    description: str
    thumbnail_url: str
    subscriber_count: Optional[str] = None


# Basic routes
@api_router.get("/")
async def root():
    return {"message": "YouTube Channel Viewer API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# YouTube API Routes
@api_router.post("/channels/search", response_model=List[ChannelSearchResult])
async def search_channels(search_query: ChannelSearch):
    """Search for YouTube channels by name"""
    try:
        youtube = get_youtube_service()
        
        # Search for channels
        search_response = youtube.search().list(
            q=search_query.query,
            part='snippet',
            type='channel',
            maxResults=10
        ).execute()
        
        results = []
        for item in search_response.get('items', []):
            channel_id = item['id']['channelId']
            
            # Get channel statistics
            channel_response = youtube.channels().list(
                part='statistics',
                id=channel_id
            ).execute()
            
            subscriber_count = "N/A"
            if channel_response['items']:
                stats = channel_response['items'][0]['statistics']
                subscriber_count = stats.get('subscriberCount', 'Hidden')
            
            results.append(ChannelSearchResult(
                channel_id=channel_id,
                title=item['snippet']['title'],
                description=item['snippet']['description'],
                thumbnail_url=item['snippet']['thumbnails']['high']['url'],
                subscriber_count=subscriber_count
            ))
        
        return results
    
    except HttpError as e:
        raise HTTPException(status_code=400, detail=f"YouTube API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching channels: {str(e)}")


@api_router.get("/channels/{channel_id}", response_model=ChannelInfo)
async def get_channel_details(channel_id: str):
    """Get detailed information about a specific channel"""
    try:
        youtube = get_youtube_service()
        
        # Get channel details
        channel_response = youtube.channels().list(
            part='snippet,statistics,brandingSettings',
            id=channel_id
        ).execute()
        
        if not channel_response['items']:
            raise HTTPException(status_code=404, detail="Channel not found")
        
        channel = channel_response['items'][0]
        snippet = channel['snippet']
        statistics = channel['statistics']
        branding = channel.get('brandingSettings', {})
        
        # Get banner URL if available
        banner_url = None
        if 'image' in branding:
            banner_url = branding['image'].get('bannerExternalUrl')
        
        return ChannelInfo(
            channel_id=channel_id,
            title=snippet['title'],
            description=snippet['description'],
            custom_url=snippet.get('customUrl'),
            thumbnail_url=snippet['thumbnails']['high']['url'],
            banner_url=banner_url,
            subscriber_count=statistics.get('subscriberCount', '0'),
            video_count=statistics.get('videoCount', '0'),
            view_count=statistics.get('viewCount', '0'),
            published_at=snippet['publishedAt']
        )
    
    except HttpError as e:
        raise HTTPException(status_code=400, detail=f"YouTube API error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching channel details: {str(e)}")


@api_router.get("/channels/{channel_id}/videos", response_model=List[VideoInfo])
async def get_channel_videos(channel_id: str, max_results: int = 20):
    """Get recent videos from a channel"""
    try:
        youtube = get_youtube_service()
        
        # Get channel's uploads playlist
        channel_response = youtube.channels().list(
            part='contentDetails',
            id=channel_id
        ).execute()
        
        if not channel_response['items']:
            raise HTTPException(status_code=404, detail="Channel not found")
        
        uploads_playlist_id = channel_response['items'][0]['contentDetails']['relatedPlaylists']['uploads']
        
        # Get videos from uploads playlist
        playlist_response = youtube.playlistItems().list(
            part='snippet',
            playlistId=uploads_playlist_id,
            maxResults=min(max_results, 50)
        ).execute()
        
        video_ids = [item['snippet']['resourceId']['videoId'] for item in playlist_response['items']]
        
        # Get video details (statistics and content details)
        videos_response = youtube.videos().list(
            part='snippet,statistics,contentDetails',
            id=','.join(video_ids)
        ).execute()
        
        results = []
        for video in videos_response['items']:
            results.append(VideoInfo(
                video_id=video['id'],
                title=video['snippet']['title'],
                description=video['snippet']['description'],
                thumbnail_url=video['snippet']['thumbnails']['high']['url'],
                published_at=video['snippet']['publishedAt'],
                duration=video['contentDetails']['duration'],
                view_count=video['statistics'].get('viewCount', '0'),
                like_count=video['statistics'].get('likeCount', '0'),
                comment_count=video['statistics'].get('commentCount', '0')
            ))
        
        return results
    
    except HttpError as e:
        raise HTTPException(status_code=400, detail=f"YouTube API error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching channel videos: {str(e)}")


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
