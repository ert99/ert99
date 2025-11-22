import { useState } from "react";
import "@/App.css";
import { Search, Users, Video, Eye, ThumbsUp, Calendar, Clock } from "lucide-react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelVideos, setChannelVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("search"); // search, channel, video

  const searchChannels = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(`${API}/channels/search`, {
        query: searchQuery
      });
      setSearchResults(response.data);
      setView("search");
    } catch (err) {
      setError(err.response?.data?.detail || "Error searching channels. Please check if YouTube API key is configured.");
    } finally {
      setLoading(false);
    }
  };

  const selectChannel = async (channelId) => {
    setLoading(true);
    setError("");
    try {
      const [channelResponse, videosResponse] = await Promise.all([
        axios.get(`${API}/channels/${channelId}`),
        axios.get(`${API}/channels/${channelId}/videos?max_results=20`)
      ]);
      setSelectedChannel(channelResponse.data);
      setChannelVideos(videosResponse.data);
      setView("channel");
    } catch (err) {
      setError(err.response?.data?.detail || "Error loading channel details");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    const number = parseInt(num);
    if (isNaN(number)) return num;
    if (number >= 1000000000) return (number / 1000000000).toFixed(1) + 'B';
    if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
    if (number >= 1000) return (number / 1000).toFixed(1) + 'K';
    return number.toString();
  };

  const formatDuration = (duration) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return duration;
    const hours = (match[1] || '').replace('H', '');
    const minutes = (match[2] || '').replace('M', '');
    const seconds = (match[3] || '').replace('S', '');
    return `${hours ? hours + ':' : ''}${minutes || '0'}:${seconds.padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchChannels();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => {
                setView("search");
                setSelectedChannel(null);
                setSelectedVideo(null);
              }}
              className="flex items-center space-x-3 hover:opacity-80 transition"
              data-testid="app-logo"
            >
              <Video className="w-8 h-8 text-red-500" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
                YouTube Channel Viewer
              </h1>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search for YouTube channels..."
                className="w-full px-6 py-4 bg-gray-800 border border-gray-700 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                data-testid="search-input"
              />
              <button
                onClick={searchChannels}
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 rounded-full transition flex items-center space-x-2"
                data-testid="search-button"
              >
                <Search className="w-5 h-5" />
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg" data-testid="error-message">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20" data-testid="loading-spinner">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
          </div>
        )}

        {/* Search Results View */}
        {!loading && view === "search" && searchResults.length > 0 && (
          <div data-testid="search-results">
            <h2 className="text-2xl font-bold mb-6">Search Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((channel) => (
                <button
                  key={channel.channel_id}
                  onClick={() => selectChannel(channel.channel_id)}
                  className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-red-500 transition transform hover:scale-105 text-left"
                  data-testid={`channel-card-${channel.channel_id}`}
                >
                  <img
                    src={channel.thumbnail_url}
                    alt={channel.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-xl font-bold mb-2 truncate">{channel.title}</h3>
                    <p className="text-gray-400 text-sm mb-2 line-clamp-2">{channel.description}</p>
                    {channel.subscriber_count && channel.subscriber_count !== 'Hidden' && (
                      <div className="flex items-center text-gray-300 text-sm">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{formatNumber(channel.subscriber_count)} subscribers</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Channel Detail View */}
        {!loading && view === "channel" && selectedChannel && (
          <div data-testid="channel-detail">
            {/* Channel Banner */}
            {selectedChannel.banner_url && (
              <div className="mb-6 rounded-lg overflow-hidden">
                <img
                  src={selectedChannel.banner_url}
                  alt="Channel Banner"
                  className="w-full h-48 object-cover"
                />
              </div>
            )}

            {/* Channel Info */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <div className="flex items-start space-x-6">
                <img
                  src={selectedChannel.thumbnail_url}
                  alt={selectedChannel.title}
                  className="w-24 h-24 rounded-full"
                />
                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-2" data-testid="channel-title">{selectedChannel.title}</h2>
                  {selectedChannel.custom_url && (
                    <p className="text-gray-400 mb-3">{selectedChannel.custom_url}</p>
                  )}
                  <div className="flex flex-wrap gap-6 mb-4">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 mr-2 text-red-500" />
                      <span className="font-semibold">{formatNumber(selectedChannel.subscriber_count)}</span>
                      <span className="text-gray-400 ml-1">subscribers</span>
                    </div>
                    <div className="flex items-center">
                      <Video className="w-5 h-5 mr-2 text-red-500" />
                      <span className="font-semibold">{formatNumber(selectedChannel.video_count)}</span>
                      <span className="text-gray-400 ml-1">videos</span>
                    </div>
                    <div className="flex items-center">
                      <Eye className="w-5 h-5 mr-2 text-red-500" />
                      <span className="font-semibold">{formatNumber(selectedChannel.view_count)}</span>
                      <span className="text-gray-400 ml-1">views</span>
                    </div>
                  </div>
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedChannel.description}</p>
                </div>
              </div>
            </div>

            {/* Channel Videos */}
            <div>
              <h3 className="text-2xl font-bold mb-6">Recent Videos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {channelVideos.map((video) => (
                  <button
                    key={video.video_id}
                    onClick={() => {
                      setSelectedVideo(video);
                      setView("video");
                    }}
                    className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-red-500 transition transform hover:scale-105 text-left"
                    data-testid={`video-card-${video.video_id}`}
                  >
                    <div className="relative">
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs">
                        {formatDuration(video.duration)}
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-semibold mb-2 line-clamp-2">{video.title}</h4>
                      <div className="flex items-center text-gray-400 text-xs space-x-3">
                        <span className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          {formatNumber(video.view_count)}
                        </span>
                        <span className="flex items-center">
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          {formatNumber(video.like_count)}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-2">{formatDate(video.published_at)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Video Player View */}
        {!loading && view === "video" && selectedVideo && (
          <div data-testid="video-player">
            <button
              onClick={() => setView("channel")}
              className="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              data-testid="back-to-channel-button"
            >
              ← Back to Channel
            </button>
            
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              {/* Video Player */}
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${selectedVideo.video_id}`}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  data-testid="youtube-iframe"
                ></iframe>
              </div>

              {/* Video Info */}
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4" data-testid="video-title">{selectedVideo.title}</h2>
                
                <div className="flex flex-wrap gap-6 mb-4">
                  <div className="flex items-center">
                    <Eye className="w-5 h-5 mr-2 text-red-500" />
                    <span className="font-semibold">{formatNumber(selectedVideo.view_count)}</span>
                    <span className="text-gray-400 ml-1">views</span>
                  </div>
                  <div className="flex items-center">
                    <ThumbsUp className="w-5 h-5 mr-2 text-red-500" />
                    <span className="font-semibold">{formatNumber(selectedVideo.like_count)}</span>
                    <span className="text-gray-400 ml-1">likes</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-red-500" />
                    <span>{formatDate(selectedVideo.published_at)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-red-500" />
                    <span>{formatDuration(selectedVideo.duration)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedVideo.description || 'No description available'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && view === "search" && searchResults.length === 0 && !error && (
          <div className="text-center py-20" data-testid="empty-state">
            <Video className="w-20 h-20 mx-auto text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-400 mb-2">Search for YouTube Channels</h2>
            <p className="text-gray-500">Enter a channel name or keyword to get started</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
