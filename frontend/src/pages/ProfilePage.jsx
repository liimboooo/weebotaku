import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getAnimeById } from "../data/animeData";
import { loadWatchlist, removeFromWatchlist, loadLikedAnime, loadRatings, loadWatchHistory } from "../services/storage";
import authService from "../services/authService";
import AnimatedPage from "../components/AnimatedPage";
import Background from "../components/Background";
import { timeAgo } from "../utils/helpers";
import { Bookmark, Heart, Star, Clock, Eye, Settings, LogOut, Film, X } from "lucide-react";
import "./ProfilePage.css";

const tabs = [
  { key: "watchlist", label: "Watchlist", icon: Bookmark },
  { key: "ratings", label: "Ratings", icon: Star },
  { key: "activity", label: "Activity", icon: Clock },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { username: profileUsername } = useParams();
  const currentUser = authService.getCurrentUser();
  const isRemoteProfile = profileUsername && profileUsername !== currentUser?.username;

  const [username, setUsername] = useState("Anime Fan");
  const [avatar, setAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("watchlist");
  const [watchlist, setWatchlist] = useState([]);
  const [liked, setLiked] = useState([]);
  const [rated, setRated] = useState({});
  const [history, setHistory] = useState([]);
  const [loadedAnime, setLoadedAnime] = useState({});
  const [remoteUser, setRemoteUser] = useState(null);

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
  }, [liked, rated, history]);

  const watchlistAnime = watchlist.filter(Boolean);
  const episodesWatched = history.length;
  const animeWatched = new Set(history.map(h => h.animeId)).size;

  const ratedAnime = Object.entries(rated)
    .map(([id, rating]) => {
      const numId = parseInt(id);
      const anime = loadedAnime[numId] || watchlist.find((w) => w.id === numId);
      return anime ? { anime, rating } : null;
    })
    .filter(Boolean);

  const userAvgRating = ratedAnime.length
    ? (ratedAnime.reduce((s, r) => s + r.rating, 0) / ratedAnime.length).toFixed(1)
    : "â€”";

  const allStats = isRemoteProfile
    ? [
        { label: "Watchlist", value: watchlist.length, icon: Bookmark },
        { label: "Episodes", value: episodesWatched, icon: Film },
        { label: "Liked", value: liked.length, icon: Heart },
      ]
    : [
        { label: "Watchlist", value: watchlist.length, icon: Bookmark },
        { label: "Episodes", value: episodesWatched, icon: Film },
        { label: "Ratings", value: ratedAnime.length, icon: Star },
        { label: "Avg Rating", value: userAvgRating, icon: Star },
        { label: "Liked", value: liked.length, icon: Heart },
        { label: "Watched", value: animeWatched, icon: Eye },
      ];

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
      window.addEventListener("progression-updated", loadProfileData);
      window.addEventListener("focus", loadProfileData);
      const interval = setInterval(loadProfileData, 5000);
      return () => {
        window.removeEventListener("storage", loadProfileData);
        window.removeEventListener("profile-avatar-updated", loadProfileData);
        window.removeEventListener("user-status-updated", loadProfileData);
        window.removeEventListener("watchlist-updated", loadProfileData);
        window.removeEventListener("profile-data-changed", loadProfileData);
        window.removeEventListener("progression-updated", loadProfileData);
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

  const navigateToAnime = (anime, event) => {
    if (document.startViewTransition) {
      const x = event.clientX || event.currentTarget.getBoundingClientRect().left + 50;
      const y = event.clientY || event.currentTarget.getBoundingClientRect().top + 50;
      document.startViewTransition(() => navigate(`/anime/${anime.id}/info`)).ready.then(() => {
        document.documentElement.style.setProperty("--reveal-radius", "0%");
        document.documentElement.style.setProperty("--reveal-x", `${x}px`);
        document.documentElement.style.setProperty("--reveal-y", `${y}px`);
        requestAnimationFrame(() => {
          document.documentElement.style.setProperty("--reveal-radius", "110%");
        });
      });
    } else {
      navigate(`/anime/${anime.id}/info`);
    }
  };

  return (
    <AnimatedPage>
      <div className="profile-page">
        <Background />

        <div className="profile-hero">
          <div className="profile-hero-bg" />
          <div className="profile-hero-content">
            <div className="profile-avatar-wrap clickable" onClick={() => editing && document.getElementById("avatar-upload")?.click()}>
              <div className="profile-avatar-circle">
                {avatarPreview || avatar ? (
                  <img src={avatarPreview || avatar} alt={username} />
                ) : (
                  <span>{username.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>

            {editing ? (
              <div className="profile-edit-area">
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="profile-input" />
                <div className="profile-edit-row">
                  <label className="profile-btn profile-btn-secondary">
                    Choose Avatar
                    <input id="avatar-upload" type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
                  </label>
                  {avatar && <button className="profile-btn profile-btn-ghost" onClick={() => { setAvatar(""); setAvatarPreview(""); }}>Remove</button>}
                </div>
                <div className="profile-edit-row">
                  <button className="profile-btn profile-btn-primary" onClick={saveProfile}>Save</button>
                  <button className="profile-btn profile-btn-ghost" onClick={() => { setEditing(false); setUsername(localStorage.getItem("animewch_username") || "Anime Fan"); setAvatar(localStorage.getItem("animewch_avatar") || ""); setAvatarPreview(localStorage.getItem("animewch_avatar") || ""); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="profile-info-area">
                <h1 className="profile-name">{username}</h1>
                {isRemoteProfile && <span className="profile-badge">Member since {new Date().getFullYear()}</span>}
                {!isRemoteProfile && (
                  <div className="profile-actions-row">
                    <button className="profile-edit-trigger" onClick={() => setEditing(true)}><Settings size={14} /> Edit Profile</button>
                    <button className="profile-logout-trigger" onClick={async () => { await authService.logout(); navigate("/"); }}><LogOut size={14} /> Sign Out</button>
                  </div>
                )}
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

        <div className="profile-tabs">
          {tabs.map(({ key, label, icon: Icon }) => {
            const count = {
              watchlist: watchlistAnime.length,
              ratings: ratedAnime.length,
              activity: history.length,
            }[key];
            return (
              <button
                key={key}
                className={`profile-tab ${activeTab === key ? "active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
                <Icon size={16} />
                <span>{label}</span>
                {count !== undefined && <span className="profile-tab-count">{count}</span>}
                {activeTab === key && <motion.div className="profile-tab-active" layoutId="tab-indicator" />}
              </button>
            );
          })}
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
                        <button className="list-item-remove" onClick={(e) => { e.stopPropagation(); removeFromWatchlist(anime.id); loadProfileData(); }} title="Remove from watchlist">
                          <X size={14} />
                        </button>
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
                      const staticAnime = loadedAnime[item.animeId];
                      const anime = staticAnime || (item.animeName ? { id: item.animeId, name: item.animeName, img: item.animeImg || "" } : null);
                      if (!anime) return null;
                      return (
                        <motion.div
                          key={item.timestamp}
                          className="activity-item"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => navigate(`/anime/${anime.id}/info`)}
                        >
                          <div className="activity-dot" />
                          <img src={anime.img} alt={anime.name} />
                          <div className="activity-body">
                            <strong>{anime.name}</strong>
                            <span>Episode {item.episode}</span>
                            <span className="activity-time">{timeAgo(item.timestamp)}</span>
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
          </motion.div>
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
