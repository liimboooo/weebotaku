import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getAnimeById, activeRooms } from "../data/animeData";
import { loadWatchlist } from "../services/storage";
import AnimatedPage from "../components/AnimatedPage";
import Background from "../components/Background";
import Slider from "../components/Slider";
import { Bookmark, Heart, Star, Clock, PenLine, LogOut, Settings, Eye, Film, Users, Video, Sparkles } from "lucide-react";
import "./ProfilePage.css";

const tabs = [
  { key: "overview", label: "Overview", icon: Eye },
  { key: "watchlist", label: "Watchlist", icon: Bookmark },
  { key: "ratings", label: "Ratings", icon: Star },
  { key: "activity", label: "Activity", icon: Clock },
  { key: "community", label: "Community", icon: Users },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("Anime Fan");
  const [avatar, setAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [statusMsg, setStatusMsg] = useState("Watching anime...");
  const [editing, setEditing] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [watchlist, setWatchlist] = useState([]);
  const [liked, setLiked] = useState([]);
  const [rated, setRated] = useState({});
  const [history, setHistory] = useState([]);

  const loadProfileData = () => {
    const storedUser = localStorage.getItem("username");
    if (storedUser) setUsername(storedUser);
    const storedAvatar = localStorage.getItem("userAvatar");
    if (storedAvatar) { setAvatar(storedAvatar); setAvatarPreview(storedAvatar); }
    const storedStatus = localStorage.getItem("userStatusMessage");
    if (storedStatus) setStatusMsg(storedStatus);
    setWatchlist(loadWatchlist());
    const storedL = JSON.parse(localStorage.getItem("likedAnime") || "[]");
    setLiked(storedL);
    const storedR = JSON.parse(localStorage.getItem("userRatings") || "{}");
    setRated(storedR);
    const storedH = JSON.parse(localStorage.getItem("watchHistory") || "[]");
    setHistory(storedH.slice(0, 10));
  };

  useEffect(() => {
    loadProfileData();
    window.addEventListener("storage", loadProfileData);
    window.addEventListener("profile-avatar-updated", loadProfileData);
    window.addEventListener("user-status-updated", loadProfileData);
    return () => {
      window.removeEventListener("storage", loadProfileData);
      window.removeEventListener("profile-avatar-updated", loadProfileData);
      window.removeEventListener("user-status-updated", loadProfileData);
    };
  }, []);

  const watchlistAnime = watchlist.map((item) => getAnimeById(item.id)).filter(Boolean);
  const likedAnime = liked.map((id) => getAnimeById(id)).filter(Boolean);
  const allHistory = JSON.parse(localStorage.getItem("watchHistory") || "[]");
  const episodesWatched = allHistory.length;
  const totalEpisodes = watchlistAnime.reduce((s, a) => s + a.episodes, 0);
  const avgRating = watchlistAnime.length
    ? (watchlistAnime.reduce((s, a) => s + a.rating, 0) / watchlistAnime.length).toFixed(1)
    : "—";

  const favoriteGenres = {};
  watchlistAnime.forEach((a) => a.genres?.forEach((g) => { favoriteGenres[g] = (favoriteGenres[g] || 0) + 1; }));
  const topGenres = Object.entries(favoriteGenres).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const ratedAnime = Object.entries(rated)
    .map(([id, rating]) => {
      const anime = getAnimeById(parseInt(id));
      return anime ? { anime, rating } : null;
    })
    .filter(Boolean);

  const allStats = [
    { label: "Watchlist", value: watchlist.length, icon: Bookmark },
    { label: "Episodes", value: totalEpisodes.toLocaleString(), icon: Film },
    { label: "Avg Rating", value: avgRating, icon: Star },
    { label: "Liked", value: likedAnime.length, icon: Heart },
    { label: "Watched", value: episodesWatched, icon: Eye },
  ];

  const saveProfile = () => {
    localStorage.setItem("username", username);
    if (avatar) localStorage.setItem("userAvatar", avatar);
    window.dispatchEvent(new Event("profile-avatar-updated"));
    setEditing(false);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const r = String(reader.result || "");
      setAvatar(r);
      setAvatarPreview(r);
    };
    reader.readAsDataURL(file);
  };

  const navigateToAnime = (anime, event) => {
    if (document.startViewTransition) {
      const x = event.clientX || event.currentTarget.getBoundingClientRect().left + 50;
      const y = event.clientY || event.currentTarget.getBoundingClientRect().top + 50;
      document.startViewTransition(() => navigate(`/anime/${anime.id}`)).ready.then(() => {
        document.documentElement.style.setProperty("--reveal-radius", "0%");
        document.documentElement.style.setProperty("--reveal-x", `${x}px`);
        document.documentElement.style.setProperty("--reveal-y", `${y}px`);
        requestAnimationFrame(() => {
          document.documentElement.style.setProperty("--reveal-radius", "110%");
        });
      });
    } else {
      navigate(`/anime/${anime.id}`);
    }
  };

  return (
    <AnimatedPage>
      <div className="profile-page">
        <Background />

        <div className="profile-hero">
          <div className="profile-hero-bg" />
          <div className="profile-hero-content">
            <div className="profile-avatar-wrap">
              <div className="profile-avatar-circle">
                {avatarPreview || avatar ? (
                  <img src={avatarPreview || avatar} alt={username} />
                ) : (
                  <span>{username.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="profile-avatar-ring" />
            </div>

            {editing ? (
              <div className="profile-edit-area">
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="profile-input" />
                <div className="profile-edit-row">
                  <label className="profile-btn profile-btn-secondary">
                    Choose Avatar
                    <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
                  </label>
                  {avatar && <button className="profile-btn profile-btn-ghost" onClick={() => { setAvatar(""); setAvatarPreview(""); localStorage.removeItem("userAvatar"); }}>Remove</button>}
                </div>
                <div className="profile-edit-row">
                  <button className="profile-btn profile-btn-primary" onClick={saveProfile}>Save</button>
                  <button className="profile-btn profile-btn-ghost" onClick={() => { setEditing(false); setUsername(localStorage.getItem("username") || "Anime Fan"); setAvatar(localStorage.getItem("userAvatar") || ""); setAvatarPreview(localStorage.getItem("userAvatar") || ""); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="profile-info-area">
                <h1 className="profile-name">{username}</h1>
                <div className="profile-status-row">
                  {editingStatus ? (
                    <div className="profile-status-edit-row">
                      <input
                        value={statusMsg}
                        onChange={(e) => setStatusMsg(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            localStorage.setItem("userStatusMessage", statusMsg);
                            window.dispatchEvent(new Event("user-status-updated"));
                            setEditingStatus(false);
                          }
                          if (e.key === "Escape") {
                            setStatusMsg(localStorage.getItem("userStatusMessage") || "Watching anime...");
                            setEditingStatus(false);
                          }
                        }}
                        className="profile-input profile-input-inline"
                        placeholder="What are you watching?"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button className="profile-status-btn" onClick={() => setEditingStatus(true)}>
                      <PenLine size={12} /> {statusMsg}
                    </button>
                  )}
                </div>
                <div className="profile-badges-row">
                  <span className="profile-badge">Member since {localStorage.getItem("memberSince") || new Date().getFullYear()}</span>
                  {watchlist.length >= 5 && <span className="profile-badge profile-badge-accent">Collector</span>}
                  {watchlist.length >= 10 && <span className="profile-badge profile-badge-accent">Hardcore Fan</span>}
                  {episodesWatched >= 30 && <span className="profile-badge profile-badge-accent">On Fire</span>}
                </div>
                <div className="profile-actions-row">
                  <button className="profile-edit-trigger" onClick={() => setEditing(true)}><Settings size={14} /> Edit Profile</button>
                  <button className="profile-logout-trigger" onClick={() => {
                    localStorage.removeItem("username");
                    localStorage.removeItem("isLoggedIn");
                    localStorage.removeItem("userAvatar");
                    localStorage.removeItem("userStatusMessage");
                    navigate("/");
                  }}><LogOut size={14} /> Sign Out</button>
                </div>
              </div>
            )}
          </div>

          <div className="profile-stats-bar">
            {allStats.map((stat) => (
              <div key={stat.label} className="profile-stat-item">
                <stat.icon size={14} />
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Slider sliderData={watchlistAnime.length > 0 ? [...new Map(watchlistAnime.map(a => [a.id, a])).values()].slice(0, 10) : []} />

        <div className="profile-tabs">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`profile-tab ${activeTab === key ? "active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={16} />
              <span>{label}</span>
              {activeTab === key && <motion.div className="profile-tab-active" layoutId="tab-indicator" />}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="profile-tab-content"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === "overview" && (
              <div className="tab-panel">
                <div className="overview-grid">
                  <div className="overview-card overview-card--genres">
                    <h3>Top Genres</h3>
                    {topGenres.length > 0 ? (
                      <div className="genre-bars">
                        {topGenres.map(([genre, count]) => (
                          <div key={genre} className="genre-bar">
                            <div className="genre-bar-label">
                              <span>{genre}</span>
                              <span>{count}</span>
                            </div>
                            <div className="genre-bar-track">
                              <div className="genre-bar-fill" style={{ width: `${(count / topGenres[0][1]) * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-msg">Add anime to see genre stats</p>
                    )}
                  </div>
                  <div className="overview-card overview-card--quick">
                    <h3>Quick Links</h3>
                    <div className="quick-links">
                      <button onClick={() => navigate("/watchlist")}><Bookmark size={16} /> Watchlist</button>
                      <button onClick={() => navigate("/history")}><Clock size={16} /> History</button>
                      <button onClick={() => navigate("/browse/anime")}><Film size={16} /> Browse</button>
                    </div>
                  </div>
                  <div className="overview-card overview-card--recent">
                    <h3>Recently Added</h3>
                    {watchlistAnime.length > 0 ? (
                      <div className="recent-mini-list">
                        {watchlistAnime.slice(0, 4).map((a) => (
                          <div key={a.id} className="recent-mini-item" onClick={() => navigate(`/anime/${a.id}`)}>
                            <img src={a.img} alt={a.name} />
                            <div>
                              <strong>{a.name}</strong>
                              <span>{a.rating}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="empty-msg">No anime in watchlist</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "watchlist" && (
              <div className="tab-panel">
                <h3>Your Watchlist ({watchlistAnime.length})</h3>
                {watchlistAnime.length > 0 ? (
                  <div className="list-grid">
                    {watchlistAnime.map((anime, i) => (
                      <motion.div
                        key={anime.id}
                        className="list-item"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={(e) => navigateToAnime(anime, e)}
                      >
                        <img src={anime.img} alt={anime.name} />
                        <div className="list-item-info">
                          <h4>{anime.name}</h4>
                          <div className="list-item-meta">
                            <span><Star size={12} /> {anime.rating}</span>
                            <span>{anime.episodes} EP</span>
                            <span className={`status-dot ${anime.status?.toLowerCase()}`}>{anime.status}</span>
                          </div>
                          {anime.genres && (
                            <div className="list-item-genres">
                              {anime.genres.slice(0, 2).map((g) => <span key={g}>{g}</span>)}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Bookmark size={40} />
                    <p>Your watchlist is empty</p>
                    <button className="profile-btn profile-btn-primary" onClick={() => navigate("/browse/anime")}>Browse Anime</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "ratings" && (
              <div className="tab-panel">
                <h3>Your Ratings ({ratedAnime.length})</h3>
                {ratedAnime.length > 0 ? (
                  <div className="list-grid">
                    {ratedAnime.map(({ anime, rating }, i) => (
                      <motion.div
                        key={anime.id}
                        className="list-item"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={(e) => navigateToAnime(anime, e)}
                      >
                        <img src={anime.img} alt={anime.name} />
                        <div className="list-item-info">
                          <h4>{anime.name}</h4>
                          <div className="list-item-meta">
                            <span className="rating-value"><Star size={12} fill="#ffd700" color="#ffd700" /> {rating}/10</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Star size={40} />
                    <p>You haven't rated any anime yet</p>
                    <button className="profile-btn profile-btn-primary" onClick={() => navigate("/browse/anime")}>Start Rating</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="tab-panel">
                <h3>Recent Activity</h3>
                {history.length > 0 ? (
                  <div className="activity-timeline">
                    {history.map((item, i) => {
                      const anime = getAnimeById(item.animeId);
                      if (!anime) return null;
                      return (
                        <motion.div
                          key={item.timestamp}
                          className="activity-item"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => navigate(`/anime/${anime.id}`)}
                        >
                          <div className="activity-dot" />
                          <img src={anime.img} alt={anime.name} />
                          <div className="activity-body">
                            <strong>{anime.name}</strong>
                            <span>Episode {item.episode}</span>
                            <span className="activity-time">{formatTimeAgo(item.timestamp)}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Clock size={40} />
                    <p>No watch history yet</p>
                    <button className="profile-btn profile-btn-primary" onClick={() => navigate("/browse/anime")}>Start Watching</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "community" && (
              <div className="tab-panel">
                <div className="community-grid">
                  <div className="community-section community-rooms">
                    <div className="community-section-header">
                      <Users size={14} />
                      <h3>Live Rooms</h3>
                      <span className="community-badge">LIVE</span>
                    </div>
                    <div className="rooms-grid">
                      {activeRooms.map((room) => (
                        <motion.div
                          key={room.id}
                          className="room-card"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => navigate("/watch-together")}
                        >
                          <div className="room-card-thumb">
                            <img src={room.thumbnail} alt={room.name} />
                            <div className="room-card-overlay">
                              <span className="room-mode-tag">{room.mode}</span>
                              <div className="room-viewers">
                                <Eye size={10} />
                                <span>{(room.viewers / 1000).toFixed(1)}K</span>
                              </div>
                            </div>
                          </div>
                          <div className="room-card-body">
                            <h4>{room.name}</h4>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="community-section community-edits">
                    <div className="community-section-header">
                      <Sparkles size={14} />
                      <h3>AMVs & Edits</h3>
                    </div>
                    <div className="edits-content">
                      <div className="edits-hero" onClick={() => navigate("/feeds/amvs")}>
                        <Video size={32} />
                        <div>
                          <strong>Explore Fan Creations</strong>
                          <span>AMVs, edits, and tributes from the community</span>
                        </div>
                      </div>
                      <div className="edits-stats">
                        <div className="edits-stat">
                          <strong>{likedAnime.length * 3 + 12}</strong>
                          <span>Edits</span>
                        </div>
                        <div className="edits-stat">
                          <strong>{likedAnime.length + 5}</strong>
                          <span>Creators</span>
                        </div>
                        <div className="edits-stat">
                          <strong>{episodesWatched * 2 + 45}K</strong>
                          <span>Views</span>
                        </div>
                      </div>
                      <button className="profile-btn profile-btn-primary" onClick={() => navigate("/feeds/amvs")}>
                        <Sparkles size={14} /> Browse Edits
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}
