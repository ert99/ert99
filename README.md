# YouTube Channel Viewer Application

A modern, full-stack application for searching and viewing YouTube channels and their videos.

## 🚀 Features

- **Channel Search**: Search for YouTube channels by name or keyword
- **Channel Details**: View comprehensive channel information including:
  - Channel banner and profile picture
  - Subscriber count, video count, and total views
  - Channel description
- **Video Gallery**: Browse recent videos from any channel
- **Video Player**: Watch videos with an embedded YouTube player
- **Statistics**: View video statistics (views, likes, publish date, duration)
- **Responsive Design**: Modern, mobile-friendly UI with Tailwind CSS

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React with Tailwind CSS
- **Database**: MongoDB
- **API**: YouTube Data API v3

## 📋 Setup Instructions

### 1. Get YouTube API Key

To use this application, you need a YouTube Data API v3 key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key

### 2. Configure the Application

Add your YouTube API key to the backend environment file:

```bash
# Edit /app/backend/.env
YOUTUBE_API_KEY="your_youtube_api_key_here"
```

### 3. Restart Services

After adding the API key, restart the backend:

```bash
sudo supervisorctl restart backend
```

## 🎯 How to Use

1. **Search for Channels**:
   - Enter a channel name or keyword in the search bar
   - Click "Search" or press Enter
   - Browse the search results with thumbnails and subscriber counts

2. **View Channel Details**:
   - Click on any channel from search results
   - See channel statistics, description, and banner
   - Browse the channel's recent videos

3. **Watch Videos**:
   - Click on any video thumbnail
   - Watch the video in the embedded player
   - View video statistics and description

## 📡 API Endpoints

### Backend API (`/api`)

- `POST /api/channels/search` - Search for channels
- `GET /api/channels/{channel_id}` - Get channel details
- `GET /api/channels/{channel_id}/videos` - Get channel videos

## 🔧 Development

### Backend
```bash
cd /app/backend
source /root/.venv/bin/activate
uvicorn server:app --reload
```

### Frontend
```bash
cd /app/frontend
yarn start
```

## 📝 Notes

- The YouTube Data API has daily quota limits (free tier: 10,000 units/day)
- Each search costs approximately 100 units
- Viewing channel details costs approximately 3-6 units
- Monitor your usage in the Google Cloud Console

## 🐛 Troubleshooting

If you see an error message about the API key:
1. Verify the API key is correctly added to `/app/backend/.env`
2. Ensure YouTube Data API v3 is enabled in your Google Cloud project
3. Restart the backend service
4. Check backend logs: `tail -f /var/log/supervisor/backend.err.log`

## 📄 License

Built with ❤️ using Emergent.sh
