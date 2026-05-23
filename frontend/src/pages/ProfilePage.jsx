import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getAnimeById } from "../data/animeData";
import { loadWatchlist, removeFromWatchlist, updateListStatus, loadLikedAnime, loadRatings, loadWatchHistory } from "../services/storage";
import authService from "../services/authService";
import AnimatedPage from "../components/AnimatedPage";
import { timeAgo } from "../utils/helpers";
import { Bookmark, Star, Eye, Film, Plus, Settings, Share2, UserPlus, X, Edit3, Trash2, ExternalLink, Calendar, ChevronDown } from "lucide-react";
import "./ProfilePage.css";

const WATCHLIST_TABS = [
  { key: "all", label: "All" },
  { key: "Watching", label: "Watching" },
  { key: "Planning", label: "Planning" },
  { key: "Completed", label: "Completed" },
  { key: "Paused", label: "Paused" },
  { key: "Dropped", label: "Dropped" },
];

const STATUS_LIST = ["Watching", "Planning", "Completed", "Paused", "Dropped"];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { username: profileUsername } = useParams();
  const currentUser = authService.getCurrentUser();
  const isRemoteProfile = profileUsername && profileUsername !== currentUser?.username;
  const isOwnProfile = !isRemoteProfile;

  const [username, setUsername] = useState("Anime Fan");
  const [avatar, setAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [watchlist, setWatchlist] = useState([]);
  const [liked, setLiked] = useState([]);
  const [rated, setRated] = useState({});
  const [history, setHistory] = useState([]);
  const [loadedAnime, setLoadedAnime] = useState({});
  const [remoteUser, setRemoteUser] = useState(null);
  const [showStatusMenu, setShowStatusMenu] = useState(null);
  const [joinDate, setJoinDate] = useState("");

  const loadProfileData = () => {
    if (isRemoteProfile) return;
    const userData = authService.getCurrentUser();
    if (userData) {
      setUsername(userData.username || "Anime Fan");
      if (userData.avatar) { setAvatar(userData.avatar); setAvatarPreview(userData.avatar); }
    }
    setWatchlist(loadWatchlist());
    setLiked(loadLikedAnime());
    setRated(loadRatings());
    setHistory(loadWatchHistory().slice(0, 10));
  };

  useEffect(() => {
    const ids = new Set();
    watchlist.forEach(item => ids.add(item.id));
    liked.forEach(id => ids.add(id));
    Object.keys(rated).forEach(id => ids.add(parseInt(id)));
    history.forEach(item => ids.add(item.animeId));
    const idsArr = [...ids].filter(Boolean);
    if (idsArr.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(idsArr.map(id => getAnimeById(id)));
      if (cancelled) return;
      const map = {};
      idsArr.forEach((id, i) => {
        if (results[i]) map[id] = results[i];
      });
      setLoadedAnime(prev => ({ ...prev, ...map }));
    })();
    return () => { cancelled = true; };
  }, [watchlist, liked, rated, history]);

  const watchingCount = watchlist.filter(w => w.listStatus === "Watching").length;
  const planningCount = watchlist.filter(w => w.listStatus === "Planning").length;
  const completedCount = watchlist.filter(w => w.listStatus === "Completed").length;
  const pausedCount = watchlist.filter(w => w.listStatus === "Paused").length;
  const droppedCount = watchlist.filter(w => w.listStatus === "Dropped").length;

  const filteredAnime = activeTab === "all"
    ? watchlist
    : watchlist.filter(w => w.listStatus === activeTab);

  const episodesWatched = history.length;
  const ratedAnime = Object.entries(rated)
    .map(([id, rating]) => {
      const numId = parseInt(id);
      const anime = loadedAnime[numId] || watchlist.find((w) => w.id === numId);
      return anime ? { anime, rating } : null;
    })
    .filter(Boolean);

  const userAvatar = avatarPreview || avatar;
  const userInitial = username.charAt(0).toUpperCase();
  const handle = `@${(currentUser?.username || username).toLowerCase().replace(/\s+/g, "")}`;

  useEffect(() => {
    const stored = localStorage.getItem("animewch_joined") || localStorage.getItem("memberSince");
    if (stored) {
      setJoinDate(stored);
    } else {
      const d = new Date();
      setJoinDate(d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
    }
  }, []);

  const saveProfile = async () => {
    try {
      await authService.updateProfile({ username, avatar });
    } catch {}
    window.dispatchEvent(new Event("profile-avatar-updated"));
    setEditing(false);
  };

  useEffect(() => {
    if (isRemoteProfile) {
      (async () => {
        try {
          const res = await authService.getUserByUsername(profileUsername);
          if (res.success && res.user) {
            const u = res.user;
            setRemoteUser(u);
            setUsername(u.username);
            setAvatar(u.avatar || '');
            setAvatarPreview(u.avatar || '');
            if (u.watchlist) {
              setWatchlist(u.watchlist.map(item => ({
                id: item.animeId, name: item.name, img: item.img,
                rating: item.rating, episodes: item.episodes,
                year: item.year, status: item.status, genres: item.genres || [],
                listStatus: item.listStatus || 'Watch Later', type: 'anime',
              })));
            }
            if (u.likedAnime) setLiked(u.likedAnime);
            if (u.ratings) setRated(u.ratings);
            if (u.watchHistory) {
              setHistory(u.watchHistory.slice(0, 10).map(h => ({
                animeId: h.animeId, episode: h.episode,
                timestamp: new Date(h.timestamp).getTime(),
                animeName: h.animeName || '', animeImg: h.animeImg || '',
              })));
            }
            if (u.createdAt) {
              const d = new Date(u.createdAt);
              setJoinDate(d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));
            }
          }
        } catch { /* ignore */ }
      })();
    } else {
      loadProfileData();
      window.addEventListener("storage", loadProfileData);
      window.addEventListener("profile-avatar-updated", loadProfileData);
      window.addEventListener("user-status-updated", loadProfileData);
      window.addEventListener("watchlist-updated", loadProfileData);
      window.addEventListener("profile-data-changed", loadProfileData);
      window.addEventListener("focus", loadProfileData);
      const interval = setInterval(loadProfileData, 5000);
      return () => {
        window.removeEventListener("storage", loadProfileData);
        window.removeEventListener("profile-avatar-updated", loadProfileData);
        window.removeEventListener("user-status-updated", loadProfileData);
        window.removeEventListener("watchlist-updated", loadProfileData);
        window.removeEventListener("profile-data-changed", loadProfileData);
        window.removeEventListener("focus", loadProfileData);
        clearInterval(interval);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUsername]);

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

  const handleRemoveFromWatchlist = (animeId, e) => {
    e.stopPropagation();
    removeFromWatchlist(animeId);
    loadProfileData();
  };

  const handleStatusChange = (animeId, newStatus, e) => {
    e.stopPropagation();
    updateListStatus(animeId, newStatus);
    setShowStatusMenu(null);
    loadProfileData();
  };

  const tabCounts = {
    all: watchlist.length,
    Watching: watchingCount,
    Planning: planningCount,
    Completed: completedCount,
    Paused: pausedCount,
    Dropped: droppedCount,
  };

  return (
    <AnimatedPage>
      <div className="profile-page">
        {/* Background gradient */}
        <div className="profile-bg" />

        {/* Header */}
        <div className="profile-header">
          <div className="profile-header-bg" />
          <div className="profile-header-content">
            <div className="profile-header-main">
              <div className="profile-avatar-section">
                <div className="profile-avatar-wrap" onClick={() => editing && document.getElementById("avatar-upload")?.click()}>
                  <div className="profile-avatar-circle">
                    {userAvatar ? (
                      <img src={userAvatar} alt={username} />
                    ) : (
                      <span>{userInitial}</span>
                    )}
                  </div>
                </div>
                <div className="profile-info">
                  <h1 className="profile-username">{username}</h1>
                  <span className="profile-handle">{handle}</span>
                  <span className="profile-joined"><Calendar size={12} /> Joined {joinDate}</span>
                </div>
              </div>
              <div className="profile-header-actions">
                {isOwnProfile && (
                  <button className="btn-icon" onClick={() => setEditing(true)} title="Edit Profile" aria-label="Edit Profile">
                    <Settings size={18} />
                  </button>
                )}
                <button className="btn-icon" onClick={() => { if (navigator.share) navigator.share({ title: username, url: window.location.href }); }} title="Share Profile" aria-label="Share Profile">
                  <Share2 size={18} />
                </button>
                {isRemoteProfile && (
                  <button className="btn-follow" aria-label="Follow User">
                    <UserPlus size={16} /> Follow
                  </button>
                )}
                {isOwnProfile && (
                  <button className="btn-logout" onClick={async () => { await authService.logout(); navigate("/"); }} title="Sign Out" aria-label="Sign Out">
                    Logout
                  </button>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="profile-stats">
              <div className="stat-card">
                <strong className="stat-number">{completedCount}</strong>
                <span className="stat-label">COMPLETED</span>
              </div>
              <div className="stat-card">
                <strong className="stat-number">{watchingCount}</strong>
                <span className="stat-label">WATCHING</span>
              </div>
              <div className="stat-card">
                <strong className="stat-number">{planningCount}</strong>
                <span className="stat-label">PLANNING</span>
              </div>
            </div>
          </div>
        </div>

        {/* Watchlist Section */}
        <div className="profile-section">
          <div className="section-header">
            <h2><Bookmark size={20} /> Watchlist <span className="section-count">{watchlist.length} anime</span></h2>
          </div>

          {/* Tabs */}
          <div className="watchlist-tabs" role="tablist" aria-label="Watchlist status filter">
            {WATCHLIST_TABS.map(({ key, label }) => (
              <button
                key={key}
                className={`watchlist-tab ${activeTab === key ? "active" : ""}`}
                onClick={() => setActiveTab(key)}
                role="tab"
                aria-selected={activeTab === key}
                aria-label={`${label} (${tabCounts[key]})`}
              >
                {label} <span className="tab-count">({tabCounts[key]})</span>
              </button>
            ))}
          </div>

          {/* Content */}
          {filteredAnime.length > 0 ? (
            <div className="anime-grid">
              <AnimatePresence mode="popLayout">
                {filteredAnime.map((item, i) => {
                  const animeData = loadedAnime[item.id];
                  const userRating = rated[item.id];
                  return (
                    <motion.div
                      key={item.id}
                      className="anime-card"
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                      onClick={(e) => {
                        if (document.startViewTransition) {
                          const x = e.clientX || e.currentTarget.getBoundingClientRect().left + 50;
                          const y = e.clientY || e.currentTarget.getBoundingClientRect().top + 50;
                          document.startViewTransition(() => navigate(`/anime/${item.id}/info`)).ready.then(() => {
                            document.documentElement.style.setProperty("--reveal-radius", "0%");
                            document.documentElement.style.setProperty("--reveal-x", `${x}px`);
                            document.documentElement.style.setProperty("--reveal-y", `${y}px`);
                            requestAnimationFrame(() => {
                              document.documentElement.style.setProperty("--reveal-radius", "110%");
                            });
                          });
                        } else {
                          navigate(`/anime/${item.id}/info`);
                        }
                      }}
                    >
                      <div className="anime-card-img-wrap">
                        <img src={item.img} alt={item.name} loading="lazy" />
                        <div className="anime-card-overlay">
                          {isOwnProfile && (
                            <>
                              <button
                                className="card-action card-action-edit"
                                onClick={(e) => setShowStatusMenu(showStatusMenu === item.id ? null : item.id)}
                                aria-label="Change status"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                className="card-action card-action-delete"
                                onClick={(e) => handleRemoveFromWatchlist(item.id, e)}
                                aria-label="Remove from watchlist"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                          <button
                            className="card-action card-action-view"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/anime/${item.id}/info`);
                            }}
                            aria-label="View details"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                        {showStatusMenu === item.id && (
                          <div className="status-menu" onClick={e => e.stopPropagation()}>
                            {STATUS_LIST.map(s => (
                              <button
                                key={s}
                                className={`status-menu-item ${item.listStatus === s ? "current" : ""}`}
                                onClick={(e) => handleStatusChange(item.id, s, e)}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="anime-card-info">
                        <h4 className="anime-card-title">{item.name}</h4>
                        <div className="anime-card-meta">
                          {item.listStatus === "Watching" && item.episodes && (
                            <span className="anime-card-progress"><Eye size={12} /> Ep {item.episodes || "?"}</span>
                          )}
                          {userRating && (
                            <span className="anime-card-rating"><Star size={12} fill="#ffd700" color="#ffd700" /> {userRating}</span>
                          )}
                        </div>
                        <span className={`anime-card-status status-${item.listStatus?.toLowerCase()}`}>{item.listStatus}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><Bookmark size={80} /></div>
              <h3 className="empty-title">No Anime Found</h3>
              <p className="empty-msg">
                {activeTab === "all"
                  ? "This user's watchlist is empty."
                  : `No anime with status "${activeTab}".`}
              </p>
              {isOwnProfile && activeTab === "all" && (
                <button className="btn-primary" onClick={() => navigate("/browse/anime")}>
                  <Plus size={16} /> Browse Anime
                </button>
              )}
            </div>
          )}
        </div>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {editing && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditing(false)}
            >
              <motion.div
                className="modal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3>Edit Profile</h3>
                  <button className="modal-close" onClick={() => setEditing(false)}><X size={18} /></button>
                </div>
                <div className="modal-body">
                  <div className="edit-avatar-section">
                    <div className="edit-avatar-circle">
                      {userAvatar ? <img src={userAvatar} alt={username} /> : <span>{userInitial}</span>}
                    </div>
                    <div className="edit-avatar-actions">
                      <label className="btn-secondary">
                        Choose Avatar
                        <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
                      </label>
                      {avatar && <button className="btn-ghost" onClick={() => { setAvatar(""); setAvatarPreview(""); }}>Remove</button>}
                    </div>
                  </div>
                  <div className="edit-field">
                    <label htmlFor="edit-username">Username</label>
                    <input
                      id="edit-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="edit-input"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                  <button className="btn-primary" onClick={saveProfile}>Save Changes</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
