import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  Bell,
  Bookmark,
  Calendar,
  ChevronDown,
  Dices,
  Flame,
  Globe,
  LogOut,
  Menu,
  MessageSquare,
  Music,
  Package,
  PenLine,
  Search,
  Settings,
  Shield,
  Star,
  Swords,
  Trophy,
  Users,
  Video,
  Zap,
  X,
} from 'lucide-react';
import { getAllAnime } from '../data/animeData';
import './Header.css';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [feedsOpen, setFeedsOpen] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [guildsOpen, setGuildsOpen] = useState(false);
  const [rankingsOpen, setRankingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [radioOpen, setRadioOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [scheduleTab, setScheduleTab] = useState('today');
  const [vaultTab, setVaultTab] = useState('featured');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTrendingFocused, setSearchTrendingFocused] = useState(false);
  const [randomPick, setRandomPick] = useState(null);
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem('userAvatar') || '');
  const [statusMessage, setStatusMessage] = useState(() => localStorage.getItem('userStatusMessage') || 'Watching One Piece...');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const feedsRef = useRef(null);
  const exploreRef = useRef(null);
  const missionsRef = useRef(null);
  const guildsRef = useRef(null);
  const rankingsRef = useRef(null);
  const profileRef = useRef(null);
  const scheduleRef = useRef(null);
  const vaultRef = useRef(null);
  const radioRef = useRef(null);
  const moreDropdownRef = useRef(null);
  const navRef = useRef(null);
  const pillRef = useRef(null);
  const randomTimeoutRef = useRef(null);
  const statusInputRef = useRef(null);
  const statusSaveTimeoutRef = useRef(null);

  const username = localStorage.getItem('username') || 'zabi';
  const episodesWatched = Number(localStorage.getItem('userEpisodesWatched') || 128);
  const currentStreak = Number(localStorage.getItem('userCurrentStreak') || 12);
  const xp = Number(localStorage.getItem('userXp') || 320);
  const hasUnclaimedRewards = localStorage.getItem('userUnclaimedRewards') === 'true';

  const [pillPos, setPillPos] = useState({ left: 0, width: 0 });
  const [completedQuestCount, setCompletedQuestCount] = useState(Number(localStorage.getItem('userCompletedQuests') || 0));
  const [pendingGuildInvitations, setPendingGuildInvitations] = useState(Number(localStorage.getItem('userPendingGuildInvitations') || 3));

  const feedItems = useMemo(
    () => [
      { label: 'Global Feed', path: '/feeds/global', icon: Globe },
      { label: 'Following', path: '/feeds/following', icon: Users },
      { label: 'Trending Discussions', path: '/feeds/trending', icon: MessageSquare },
      { label: 'Fan Art & Reviews', path: '/feeds/fanart', icon: Star },
      { label: 'Watch Together', path: '/watch-together', icon: Video, description: 'Watch with friends in real-time' },
    ],
    []
  );

  const questTemplates = useMemo(
    () => [
      { title: 'Watch 20 mins', icon: '📺', target: '20 mins', type: 'watch' },
      { title: 'Rate an Anime', icon: '⭐', target: '1 Rating', type: 'rate' },
      { title: 'Comment on Thread', icon: '💬', target: '1 Comment', type: 'comment' },
      { title: 'Follow a User', icon: '👥', target: '1 Follow', type: 'follow' },
      { title: 'Complete Profile', icon: '📝', target: '100%', type: 'profile' },
    ],
    []
  );

  const dailyQuests = useMemo(() => {
    const today = new Date().toDateString();
    const lastRefresh = localStorage.getItem('userLastQuestRefresh');
    if (lastRefresh !== today) {
      const shuffled = [...questTemplates].sort(() => Math.random() - 0.5).slice(0, 3);
      const quests = shuffled.map((q, i) => ({ ...q, id: i, progress: Math.floor(Math.random() * 100) }));
      localStorage.setItem('userDailyQuests', JSON.stringify(quests));
      localStorage.setItem('userLastQuestRefresh', today);
      return quests;
    }
    const stored = localStorage.getItem('userDailyQuests');
    return stored ? JSON.parse(stored) : [];
  }, [questTemplates]);

  const userGuilds = useMemo(
    () => [
      { id: 1, name: 'Weebs United', level: 12, icon: '🎌', members: 342 },
      { id: 2, name: 'Manga Collective', level: 8, icon: '📚', members: 187 },
      { id: 3, name: 'AMV Creators', level: 5, icon: '🎬', members: 94 },
    ],
    []
  );

  const topCharacter = useMemo(
    () => ({
      name: 'Monkey D. Luffy',
      anime: 'One Piece',
      votes: 2847,
      avatar: '🏴‍☠️',
      trend: '+284 today',
    }),
    []
  );

  const battleArenaData = useMemo(
    () => ({
      character: {
        left: { name: 'Luffy', anime: 'One Piece', icon: '🏴‍☠️' },
        right: { name: 'Naruto', anime: 'Naruto', icon: '🍃' },
        leftVotes: 5230,
        rightVotes: 4892,
      },
      animeOfWeek: {
        title: 'Jujutsu Kaisen vs Attack on Titan',
        endsIn: '2 days',
      },
      isLive: true,
    }),
    []
  );

  const hallOfFameLinks = useMemo(
    () => [
      { label: 'Top 100 Anime', path: '/rankings/anime', icon: '🏆' },
      { label: 'Top 100 Manga', path: '/rankings/manga', icon: '📚' },
      { label: 'Legendary Studios', path: '/rankings/studios', icon: '🎬' },
    ],
    []
  );

  const scheduleItems = useMemo(
    () => ({
      today: [
        { title: 'Jujutsu Kaisen S3', time: '10:00 PM', ep: 'Ep. 22', icon: '🗡️', live: false },
        { title: 'Attack on Titan', time: '9:00 PM', ep: 'Ep. 18', icon: '⚔️', live: false },
        { title: 'Demon Slayer', time: '8:30 PM', ep: 'Ep. 12', icon: '😈', live: false },
      ],
      upcoming: [
        { title: 'Chainsaw Man S2', date: 'May 10', ep: 'Ep. 1', icon: '🔗', countdown: '5 days' },
        { title: 'My Hero Academia S7', date: 'May 15', ep: 'Ep. 1', icon: '💥', countdown: '10 days' },
        { title: 'Solo Leveling', date: 'May 12', ep: 'Ep. 5', icon: '🌙', countdown: '7 days' },
      ],
    }),
    []
  );

  const vaultCards = useMemo(
    () => ({
      featured: [
        { id: 1, title: 'Luffy Legendary', series: 'One Piece', rarity: 'SSR', icon: '🏴‍☠️' },
        { id: 2, title: 'Goku Ultra', series: 'Dragon Ball', rarity: 'SSR', icon: '👨‍🚀' },
      ],
      all: [
        { id: 1, title: 'Luffy Legendary', series: 'One Piece', rarity: 'SSR', icon: '🏴‍☠️' },
        { id: 2, title: 'Naruto Prime', series: 'Naruto', rarity: 'SSR', icon: '🍃' },
        { id: 3, title: 'Tanjiro Brave', series: 'Demon Slayer', rarity: 'SR', icon: '😈' },
        { id: 4, title: 'Ichigo Soul', series: 'Bleach', rarity: 'SR', icon: '⚪' },
      ],
      bySeries: [
        { series: 'One Piece', count: 8 },
        { series: 'Naruto', count: 6 },
        { series: 'Dragon Ball', count: 5 },
        { series: 'Demon Slayer', count: 4 },
      ],
    }),
    []
  );

  const trendingAnime = useMemo(
    () => [
      { title: 'Jujutsu Kaisen', trend: '↑ +284' },
      { title: 'Attack on Titan', trend: '↑ +156' },
      { title: 'One Piece', trend: '→ +42' },
      { title: 'Demon Slayer', trend: '↓ -18' },
      { title: 'Solo Leveling', trend: '↑ +512' },
    ],
    []
  );

  const radioPlaylist = useMemo(
    () => ({
      nowPlaying: {
        title: 'Gurenge',
        anime: 'Demon Slayer OP1',
        duration: '1:30',
        artist: 'LiSA',
        icon: '🎵',
      },
      next: [
        { title: 'Unravel', anime: 'Tokyo Ghoul OP1', artist: 'TK from Ling Tosite Sigure' },
        { title: 'Again', anime: 'Attack on Titan OP1', artist: 'Shinzou wo Sasageyo' },
      ],
    }),
    []
  );

  useEffect(() => {
    const closeOnClickOutside = (event) => {
      if (feedsRef.current && !feedsRef.current.contains(event.target)) setFeedsOpen(false);
      if (exploreRef.current && !exploreRef.current.contains(event.target)) setExploreOpen(false);
      if (missionsRef.current && !missionsRef.current.contains(event.target)) setMissionsOpen(false);
      if (guildsRef.current && !guildsRef.current.contains(event.target)) setGuildsOpen(false);
      if (rankingsRef.current && !rankingsRef.current.contains(event.target)) setRankingsOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
      if (scheduleRef.current && !scheduleRef.current.contains(event.target)) setScheduleOpen(false);
      if (vaultRef.current && !vaultRef.current.contains(event.target)) setVaultOpen(false);
      if (radioRef.current && !radioRef.current.contains(event.target)) setRadioOpen(false);
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target)) setMoreDropdownOpen(false);
    };

    document.addEventListener('click', closeOnClickOutside);
    return () => document.removeEventListener('click', closeOnClickOutside);
  }, []);

  const rankTrack = useMemo(
    () => [
      { name: 'Genin', min: 150, max: 400 },
      { name: 'Chunin', min: 400, max: 700 },
      { name: 'Jonin', min: 700, max: 1100 },
      { name: 'Kage', min: 1100, max: 1500 },
    ],
    []
  );

  const rankState = useMemo(() => {
    const current = [...rankTrack].reverse().find((entry) => xp >= entry.min) || rankTrack[0];
    const currentIndex = rankTrack.findIndex((entry) => entry.name === current.name);
    const next = rankTrack[currentIndex + 1] || null;
    const span = next ? next.min - current.min : 0;
    const progress = next ? Math.max(0, Math.min(100, ((xp - current.min) / span) * 100)) : 100;
    const remaining = next ? Math.max(0, next.min - xp) : 0;

    return {
      current,
      next,
      progress,
      remaining,
      isMaxed: !next,
    };
  }, [rankTrack, xp]);

  useEffect(() => {
    const syncAvatar = () => setProfileImage(localStorage.getItem('userAvatar') || '');
    const syncStatus = () => setStatusMessage(localStorage.getItem('userStatusMessage') || 'Watching One Piece...');
    const syncOnline = () => setIsOnline(navigator.onLine);

    window.addEventListener('storage', syncAvatar);
    window.addEventListener('profile-avatar-updated', syncAvatar);
    window.addEventListener('online', syncOnline);
    window.addEventListener('offline', syncOnline);
    window.addEventListener('user-status-updated', syncStatus);
    return () => {
      window.removeEventListener('storage', syncAvatar);
      window.removeEventListener('profile-avatar-updated', syncAvatar);
      window.removeEventListener('online', syncOnline);
      window.removeEventListener('offline', syncOnline);
      window.removeEventListener('user-status-updated', syncStatus);
    };
  }, []);

  const navigateTo = (path) => {
    navigate(path);
    setMobileOpen(false);
    setExploreOpen(false);
    setFeedsOpen(false);
    setMissionsOpen(false);
    setGuildsOpen(false);
    setRankingsOpen(false);
    setProfileOpen(false);
    setScheduleOpen(false);
    setVaultOpen(false);
    setRadioOpen(false);
    setMoreDropdownOpen(false);
  };

  const handleSearch = () => {
    const query = searchTerm.trim();
    if (!query) return;
    navigateTo(`/search?q=${encodeURIComponent(query)}`);
  };

  const pickRandomAnime = () => {
    const allAnime = getAllAnime();
    if (!allAnime.length) return;
    const item = allAnime[Math.floor(Math.random() * allAnime.length)];
    setRandomPick(item);
    clearTimeout(randomTimeoutRef.current);
    randomTimeoutRef.current = setTimeout(() => setRandomPick(null), 4000);
  };

  useEffect(() => {
    if (profileOpen && isEditingStatus && statusInputRef.current) {
      statusInputRef.current.focus();
      statusInputRef.current.select();
    }
  }, [profileOpen, isEditingStatus]);

  useEffect(() => () => clearTimeout(statusSaveTimeoutRef.current), []);

  const saveStatusMessage = (nextStatus) => {
    const value = nextStatus.trim() || 'Watching One Piece...';
    localStorage.setItem('userStatusMessage', value);
    window.dispatchEvent(new Event('user-status-updated'));
    setStatusMessage(value);
    setIsEditingStatus(false);
  };

  const handleNavPillPosition = (element) => {
    if (element && pillRef.current && navRef.current) {
      const rect = element.getBoundingClientRect();
      const navRect = navRef.current.getBoundingClientRect();
      setPillPos({
        left: rect.left - navRect.left,
        width: rect.width,
      });
    }
  };

  const claimQuests = () => {
    const completedCount = dailyQuests.filter((q) => q.progress >= 75).length;
    const newTotal = completedQuestCount + completedCount;
    setCompletedQuestCount(newTotal);
    localStorage.setItem('userCompletedQuests', String(newTotal));
    setMissionsOpen(false);
  };

  const navLinkClass = (path) =>
    `nav-link ${location.pathname === path ? 'active' : ''}`;

  return (
    <header className="header">
      <div className="header-shell">
        <button className="mobile-toggle" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle navigation">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <button className="brand" onClick={() => navigateTo('/home')} aria-label="AnimeWch home">
          <span className="brand-icon">
            <img className="brand-logo" src="/logo.png" alt="AnimeWch" />
          </span>
          <span className="brand-text">AnimeWch</span>
        </button>

        <div className={`header-panel ${mobileOpen ? 'open' : ''}`}>
          <nav className="header-nav" aria-label="Primary">
            <div className="explore-dropdown-container" ref={exploreRef}>
              <button
                className={`nav-link ${exploreOpen ? 'active' : ''}`}
                onClick={() => setExploreOpen((value) => !value)}
                aria-expanded={exploreOpen}
                aria-haspopup="true"
              >
                <Globe size={16} />
                <span>Explore</span>
              </button>
              {exploreOpen && (
                <div className="explore-dropdown">
                  <button className="explore-item" onClick={() => navigateTo('/seasonal')}>
                    <span className="explore-item-icon">📅</span>
                    <div>
                      <span className="explore-item-label">Release Schedule</span>
                      <span className="explore-item-description">Upcoming episodes</span>
                    </div>
                  </button>
                  <button className="explore-item" onClick={() => navigateTo('/seasonal/charts')}>
                    <span className="explore-item-icon">📊</span>
                    <div>
                      <span className="explore-item-label">Seasonal Charts</span>
                      <span className="explore-item-description">Top titles by season</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <div className="feeds-dropdown-container" ref={feedsRef}>
              <button
                className={`nav-link ${feedsOpen ? 'active' : ''}`}
                onClick={() => setFeedsOpen((value) => !value)}
                aria-expanded={feedsOpen}
                aria-haspopup="true"
              >
                <MessageSquare size={16} />
                <span>Feeds</span>
              </button>

              {feedsOpen && (
                <div className="feeds-dropdown">
                  {feedItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.path} className="feeds-item" onClick={() => navigateTo(item.path)}>
                        <span className="feeds-item-icon">
                          {typeof item.icon === 'function' ? <Icon size={16} /> : item.icon}
                        </span>
                        <div>
                          <span className="feeds-item-label">{item.label}</span>
                          {item.description ? <span className="feeds-item-description">{item.description}</span> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="schedule-dropdown-container" ref={scheduleRef}>
              <button
                className={`nav-link ${scheduleOpen ? 'active' : ''}`}
                onClick={() => setScheduleOpen((value) => !value)}
                aria-expanded={scheduleOpen}
                aria-haspopup="true"
              >
                <Calendar size={18} />
                <span>Schedule</span>
              </button>

              {scheduleOpen && (
                <div className="schedule-dropdown">
                  <div className="schedule-tabs">
                    <button
                      className={`schedule-tab ${scheduleTab === 'today' ? 'active' : ''}`}
                      onClick={() => setScheduleTab('today')}
                    >
                      Today
                    </button>
                    <button
                      className={`schedule-tab ${scheduleTab === 'upcoming' ? 'active' : ''}`}
                      onClick={() => setScheduleTab('upcoming')}
                    >
                      Upcoming
                    </button>
                  </div>

                  <div className="schedule-items">
                    {scheduleTab === 'today' ? (
                      scheduleItems.today.map((item, idx) => (
                        <button
                          key={idx}
                          className="schedule-item"
                          onClick={() => navigateTo('/schedule')}
                        >
                          <span className="schedule-item-icon">{item.icon}</span>
                          <div className="schedule-item-info">
                            <div className="schedule-item-title">{item.title}</div>
                            <div className="schedule-item-meta">
                              <span className="schedule-item-time">{item.time}</span>
                              <span className="schedule-item-ep">{item.ep}</span>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      scheduleItems.upcoming.map((item, idx) => (
                        <button
                          key={idx}
                          className="schedule-item"
                          onClick={() => navigateTo('/schedule')}
                        >
                          <span className="schedule-item-icon">{item.icon}</span>
                          <div className="schedule-item-info">
                            <div className="schedule-item-title">{item.title}</div>
                            <div className="schedule-item-meta">
                              <span className="schedule-item-date">{item.date}</span>
                              <span className="schedule-item-countdown">{item.countdown}</span>
                            </div>
                          </div>
                          <span className="schedule-item-ep">{item.ep}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="vault-dropdown-container" ref={vaultRef}>
              <button
                className={`nav-link ${vaultOpen ? 'active' : ''}`}
                onClick={() => setVaultOpen((value) => !value)}
                aria-expanded={vaultOpen}
                aria-haspopup="true"
              >
                <Package size={18} />
                <span>Vault</span>
              </button>

              {vaultOpen && (
                <div className="vault-dropdown">
                  <div className="vault-tabs">
                    <button
                      className={`vault-tab ${vaultTab === 'featured' ? 'active' : ''}`}
                      onClick={() => setVaultTab('featured')}
                    >
                      Featured
                    </button>
                    <button
                      className={`vault-tab ${vaultTab === 'all' ? 'active' : ''}`}
                      onClick={() => setVaultTab('all')}
                    >
                      All
                    </button>
                    <button
                      className={`vault-tab ${vaultTab === 'bySeries' ? 'active' : ''}`}
                      onClick={() => setVaultTab('bySeries')}
                    >
                      By Series
                    </button>
                  </div>

                  <div className="vault-items">
                    {vaultTab === 'featured' && (
                      vaultCards.featured.map((card) => (
                        <button
                          key={card.id}
                          className="vault-card"
                          onClick={() => navigateTo('/vault')}
                        >
                          <span className="vault-card-icon">{card.icon}</span>
                          <div className="vault-card-info">
                            <div className="vault-card-title">{card.title}</div>
                            <div className="vault-card-series">{card.series}</div>
                          </div>
                          <span className="vault-card-rarity">{card.rarity}</span>
                        </button>
                      ))
                    )}

                    {vaultTab === 'all' && (
                      vaultCards.all.map((card) => (
                        <button
                          key={card.id}
                          className="vault-card"
                          onClick={() => navigateTo('/vault')}
                        >
                          <span className="vault-card-icon">{card.icon}</span>
                          <div className="vault-card-info">
                            <div className="vault-card-title">{card.title}</div>
                            <div className="vault-card-series">{card.series}</div>
                          </div>
                          <span className={`vault-card-rarity vault-rarity-${card.rarity}`}>{card.rarity}</span>
                        </button>
                      ))
                    )}

                    {vaultTab === 'bySeries' && (
                      vaultCards.bySeries.map((series, idx) => (
                        <button
                          key={idx}
                          className="vault-series-item"
                          onClick={() => navigateTo('/vault')}
                        >
                          <div className="vault-series-name">{series.series}</div>
                          <span className="vault-series-count">{series.count} cards</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="radio-dropdown-container" ref={radioRef}>
              <button
                className={`nav-link ${radioOpen ? 'active' : ''}`}
                onClick={() => setRadioOpen((value) => !value)}
                aria-expanded={radioOpen}
                aria-haspopup="true"
              >
                <Music size={18} />
                <span>Radio</span>
              </button>

              {radioOpen && (
                <div className="radio-dropdown">
                  <div className="radio-now-playing">
                    <div className="radio-section-header">Now Playing</div>
                    <button
                      className="radio-track now-playing"
                      onClick={() => navigateTo('/radio')}
                    >
                      <span className="radio-track-icon">{radioPlaylist.nowPlaying.icon}</span>
                      <div className="radio-track-info">
                        <div className="radio-track-title">{radioPlaylist.nowPlaying.title}</div>
                        <div className="radio-track-anime">{radioPlaylist.nowPlaying.anime}</div>
                        <div className="radio-track-artist">{radioPlaylist.nowPlaying.artist}</div>
                      </div>
                      <span className="radio-play-indicator">▶</span>
                    </button>
                  </div>

                  <div className="radio-next-up">
                    <div className="radio-section-header">Next Up</div>
                    <div className="radio-next-items">
                      {radioPlaylist.next.map((track, idx) => (
                        <button
                          key={idx}
                          className="radio-track next"
                          onClick={() => navigateTo('/radio')}
                        >
                          <span className="radio-track-number">{idx + 1}</span>
                          <div className="radio-track-info">
                            <div className="radio-track-title">{track.title}</div>
                            <div className="radio-track-anime">{track.anime}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="more-dropdown-container" ref={moreDropdownRef}>
              <button
                className="more-button"
                onClick={() => setMoreDropdownOpen((value) => !value)}
                aria-expanded={moreDropdownOpen}
                aria-haspopup="true"
              >
                More <ChevronDown size={14} />
              </button>

              {moreDropdownOpen && (
                <div className="more-dropdown">
                  <button className="more-item" onClick={() => navigateTo('/rankings')}>
                    <Swords size={16} />
                    <span>Rankings</span>
                  </button>
                  <button className="more-item" onClick={() => navigateTo('/guilds')}>
                    <Shield size={16} />
                    <span>Guilds</span>
                  </button>
                  <button className="more-item" onClick={() => navigateTo('/missions')}>
                    <Trophy size={16} />
                    <span>Missions</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        <form className="search-form" onSubmit={(event) => { event.preventDefault(); handleSearch(); }}>
          <span className="search-icon">
            <Search size={16} />
          </span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setSearchTrendingFocused(true)}
            onBlur={() => setTimeout(() => setSearchTrendingFocused(false), 150)}
            placeholder="Search anime..."
            aria-label="Search anime"
          />
          <button type="submit" aria-label="Search">Go</button>
          <button type="button" className="action-icon" onClick={pickRandomAnime} aria-label="Random anime" title="Random anime">
            🎲
          </button>

          {searchTrendingFocused && trendingAnime.length > 0 && (
            <div className="search-trending">
              <div className="search-trending-header">Trending Now</div>
              <div className="search-trending-pills">
                {trendingAnime.map((anime, idx) => (
                  <button
                    key={idx}
                    className="search-trending-pill"
                    onClick={() => {
                      setSearchTerm(anime.title);
                      handleSearch();
                    }}
                  >
                    {anime.title}
                    <span className="trending-indicator">{anime.trend}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        <div className="header-actions">
          <button className="icon-button" onClick={() => navigateTo('/watch-together')} title="Watch Together">
            <Video size={16} />
          </button>

          <button className={`icon-button badge`} data-badge="3" onClick={() => navigateTo('/notifications')} title="Notifications">
            <Bell size={16} />
          </button>

          <button className="icon-button" onClick={() => navigateTo('/watchlist')} title="Watchlist">
            <Bookmark size={16} />
          </button>

          <div className="profile-dropdown-container" ref={profileRef}>
            <button
              className="profile-button"
              onClick={() => setProfileOpen((value) => !value)}
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <span className="profile-avatar-shell" style={{ '--xp-progress': `${rankState.progress}%` }}>
                {profileImage ? (
                  <img src={profileImage} alt={username} className="profile-avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                ) : (
                  <span className="profile-avatar">{username.charAt(0).toUpperCase()}</span>
                )}
              </span>
              <span className="profile-copy">
                <span className="profile-username">{username}</span>
                <span className="profile-status-line">{statusMessage}</span>
              </span>
            </button>

            {profileOpen && (
              <div className="profile-mini-card">
                <div className="profile-mini-card-glow" />

                <div className="profile-mini-card-header">
                  <div className="profile-mini-summary">
                    <span className="profile-avatar-shell profile-avatar-shell--compact" style={{ '--xp-progress': `${rankState.progress}%` }}>
                      {profileImage ? (
                        <img src={profileImage} alt={username} className="profile-avatar--compact" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                      ) : (
                        <span className="profile-avatar--compact">{username.charAt(0).toUpperCase()}</span>
                      )}
                    </span>
                    <div>
                      <div className="profile-mini-name">{username}</div>
                      <div className="profile-mini-meta">
                        <span className={`profile-mini-meta-pill ${isOnline ? 'online' : 'offline'}`}>
                          {isOnline ? '🟢 Online' : '⚫ Offline'}
                        </span>
                        {hasUnclaimedRewards && <span className="profile-mini-meta-pill profile-mini-meta-pill--glow">🎁 Rewards</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="profile-stats-grid">
                  <div className="profile-stat-card">
                    <span className="profile-stat-value">{episodesWatched}</span>
                    <span className="profile-stat-label">Episodes</span>
                  </div>
                  <div className="profile-stat-card">
                    <span className="profile-stat-value">
                      <Flame size={14} /> {currentStreak}
                    </span>
                    <span className="profile-stat-label">Streak</span>
                  </div>
                </div>

                <div className="profile-rank-section">
                  <div className="profile-rank-title">
                    Rank: <strong>{rankState.current.name}</strong>
                  </div>
                  <div className="profile-rank-bar">
                    <div className="profile-rank-bar-fill" style={{ width: `${rankState.progress}%` }} />
                  </div>
                  <div className="profile-rank-meta">
                    {rankState.next ? (
                      <span>{rankState.remaining.toLocaleString()} XP to {rankState.next.name}</span>
                    ) : (
                      <span>🏆 Maxed Out!</span>
                    )}
                  </div>
                </div>

                <div className="profile-status-edit">
                  {isEditingStatus ? (
                    <div className="profile-status-input-group">
                      <input
                        ref={statusInputRef}
                        type="text"
                        value={statusMessage}
                        onChange={(e) => setStatusMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveStatusMessage(statusMessage);
                            clearTimeout(statusSaveTimeoutRef.current);
                            statusSaveTimeoutRef.current = setTimeout(() => setIsEditingStatus(false), 1500);
                          }
                          if (e.key === 'Escape') {
                            setIsEditingStatus(false);
                            setStatusMessage(localStorage.getItem('userStatusMessage') || 'Watching One Piece...');
                          }
                        }}
                        className="profile-status-input"
                        placeholder="Update your status..."
                      />
                      <button
                        className="profile-status-button"
                        onClick={() => {
                          saveStatusMessage(statusMessage);
                          clearTimeout(statusSaveTimeoutRef.current);
                          statusSaveTimeoutRef.current = setTimeout(() => setIsEditingStatus(false), 1500);
                        }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      className="profile-status-button"
                      onClick={() => setIsEditingStatus(true)}
                    >
                      <PenLine size={12} /> Edit Status
                    </button>
                  )}
                </div>

                <div className="profile-actions-grid">
                  <button className="profile-action-card" onClick={() => navigateTo('/profile')}>
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  <button className="profile-action-card" onClick={() => navigateTo('/watchlist')}>
                    <Bookmark size={16} />
                    <span>Watchlist</span>
                  </button>
                  <button className="profile-action-card profile-action-card--danger" onClick={() => { localStorage.clear(); navigateTo('/home'); }}>
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {randomPick ? (
          <div className="feeds-dropdown" style={{ right: 18, left: 'auto', top: 'calc(100% + 10px)', minWidth: '280px' }}>
            <button className="feeds-item" onClick={() => navigateTo(`/anime/${randomPick.id}`)}>
              <span className="feeds-item-icon">🎲</span>
              <div>
                <span className="feeds-item-label">Random pick: {randomPick.name}</span>
                <span className="feeds-item-description">Open the anime details page</span>
              </div>
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
