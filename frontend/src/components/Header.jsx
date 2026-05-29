import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Gift, LogOut, Menu, Search, Volume2, VolumeX, Bookmark } from 'lucide-react';
import authService from '../services/authService';
import { loadWatchHistory } from '../services/storage';
import { formatTimeAgo } from '../utils/helpers';
import { getNotifications, getUnreadCount, markRead, markAllRead, clearNotifications, fetchServerNotifications, seedBroadcastNotifications, handleSocketNotification, startPolling, stopPolling } from '../services/notificationService';
import { connectSocket, disconnectSocket } from '../services/socket';
import { fetchAggregatedNews } from '../services/newsAggregator';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    let s; try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
    return getNotifications(s);
  });
  const [unreadCount, setUnreadCount] = useState(() => {
    let s; try { s = JSON.parse(localStorage.getItem('animewch_settings')); } catch {}
    return getUnreadCount(s);
  });
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('userAvatar') || '');
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const username = localStorage.getItem('username') || 'Guest';
  const [episodesWatched, setEpisodesWatched] = useState(() => loadWatchHistory().length);
  const hasUnclaimedRewards = localStorage.getItem('userUnclaimedRewards') === 'true';
  const [muted, setMuted] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSidebar = () => window.dispatchEvent(new CustomEvent('sidebar-toggle'));

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <nav className="top-nav">
      <div className="top-nav-left">
        <button className="top-nav-hamburger" onClick={toggleSidebar} aria-label="Toggle navigation">
          <Menu size={20} />
        </button>
        <button className="top-nav-brand" onClick={() => navigate('/home')} aria-label="Home">
          Anime<span className="brand-highlight">Wch</span>
        </button>
      </div>

      <div className="top-nav-right">
        <div className="top-nav-search">
          <Search size={15} className="top-nav-search-icon" />
          <input
            type="text"
            placeholder="Search anime..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>
      </div>
    </nav>
  );
}
