import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getAnimeById } from "../data/animeData";
import { loadWatchlist, removeFromWatchlist } from "../services/storage";
import authService from "../services/authService";
import * as tierlistService from "../services/tierlistService";
import AnimatedPage from "../components/AnimatedPage";
import Background from "../components/Background";
import { formatCount, timeAgo as formatTimeAgo, notify } from "../utils/helpers";
import { getCurrentXP, getCurrentLevel, getLevelProgress, getStreak, getBadges, getAllBadgeDefs } from "../services/progression";
import { Bookmark, Heart, Star, Clock, PenLine, LogOut, Settings, Eye, Film, Users, Video, Sparkles, Layers, Zap, Trophy, Flame, Crown, Gem, Gamepad2, Library, MessageSquare, FolderOpen, X } from "lucide-react";
import "./ProfilePage.css";

const badgeIconMap = {
  Library: Library, Flame: Flame, Zap: Zap, Star: Star,
  MessageSquare: MessageSquare, Gamepad2: Gamepad2, Trophy: Trophy,
  Gem: Gem, Crown: Crown, FolderOpen: FolderOpen,
};
function BadgeIcon({ name, size = 12 }) {
  const Icon = badgeIconMap[name];
  return Icon ? <Icon size={size} /> : null;
}

const tabs = [
  { key: "overview", label: "Overview", icon: Eye },
  { key: "watchlist", label: "Watchlist", icon: Bookmark },
  { key: "ratings", label: "Ratings", icon: Star },
  { key: "activity", label: "Activity", icon: Clock },
  { key: "tierlists", label: "Tier Lists", icon: Layers },
  { key: "community", label: "Community", icon: Users },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { username: profileUsername } = useParams();
  const currentUser = authService.getCurrentUser();
  const isRemoteProfile = profileUsername && profileUsername !== currentUser?.username;

  const [username, setUsername] = useState("Anime Fan");
  const [avatar, setAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [banner, setBanner] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [watchlist, setWatchlist] = useState([]);
  const [liked, setLiked] = useState([]);
  const [rated, setRated] = useState({});
  const [history, setHistory] = useState([]);
  const [tierLists, setTierLists] = useState([]);
  const [tierListsLoading, setTierListsLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [loadedAnime, setLoadedAnime] = useState({});

  const loadTierLists = async () => {
    setTierListsLoading(true);
    try {
      if (isRemoteProfile) {
        const res = await tierlistService.getUserTierListsByUsername(profileUsername);
        if (res.success) setTierLists(res.data);
      } else {
        const user = authService.getCurrentUser();
        if (!user?.id) { setTierListsLoading(false); return; }
        const res = await tierlistService.getUserTierLists(user.id);
        if (res.success) setTierLists(res.data);
      }
    } catch { /* ignore */ }
    setTierListsLoading(false);
  };

  const loadProfileData = () => {
    if (isRemoteProfile) return;
    const storedUser = localStorage.getItem("username");
    if (storedUser) setUsername(storedUser);
    const storedAvatar = localStorage.getItem("userAvatar");
    if (storedAvatar) { setAvatar(storedAvatar); setAvatarPreview(storedAvatar); }
    const storedBanner = localStorage.getItem("userBanner");
    if (storedBanner) { setBanner(storedBanner); setBannerPreview(storedBanner); }
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
  const likedAnime = liked.map((id) => loadedAnime[id]).filter(Boolean);

  const ratedAnime = Object.entries(rated)
    .map(([id, rating]) => {
      const numId = parseInt(id);
      const anime = loadedAnime[numId] || watchlist.find((w) => w.id === numId);
      return anime ? { anime, rating } : null;
    })
    .filter(Boolean);
  const currentWatch = history[0] && loadedAnime[history[0].animeId] ? { ...loadedAnime[history[0].animeId], episode: history[0].episode } : null;

  const userAvgRating = ratedAnime.length
    ? (ratedAnime.reduce((s, r) => s + r.rating, 0) / ratedAnime.length).toFixed(1)
    : "—";

  const favoriteGenres = {};
  watchlistAnime.forEach((a) => a.genres?.forEach((g) => { favoriteGenres[g] = (favoriteGenres[g] || 0) + 1; }));
  const topGenres = Object.entries(favoriteGenres).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const auraColors = {
    Action: "#8b5cf6", Adventure: "#f59e0b", Comedy: "#22c55e", Drama: "#a855f7",
    Fantasy: "#3b82f6", Horror: "#881337", Romance: "#ec4899", "Sci-Fi": "#06b6d4",
    "Slice of Life": "#f97316", Sports: "#14b8a6", Thriller: "#64748b", Mystery: "#8b5cf6",
  };
  const dominantGenre = topGenres[0]?.[0];
  const auraColor = auraColors[dominantGenre] || "#8b5cf6";

  const storedEdits = (() => { try { return JSON.parse(localStorage.getItem("amv_edits") || "[]"); } catch { return []; } })();
  const totalEdits = formatCount(storedEdits.length);
  const totalCreators = formatCount(new Set(storedEdits.map(e => e.creator)).size);
  const totalViews = formatCount(storedEdits.reduce((s, e) => s + (e.views || 0), 0));

  const userXP = getCurrentXP();
  const userLevel = getCurrentLevel();
  const xpProgress = getLevelProgress(userXP);
  const streakData = getStreak();
  const earnedBadges = !isRemoteProfile ? getBadges({ watchlistCount: watchlist.length, episodesWatched, ratingCount: Object.keys(rated).length }) : [];

  const allStats = isRemoteProfile
    ? [
        { label: "Tier Lists", value: tierLists.length, icon: Layers },
      ]
    : [
        { label: "Watchlist", value: watchlist.length, icon: Bookmark },
        { label: "Episodes", value: episodesWatched, icon: Film },
        { label: "Avg Rating", value: userAvgRating, icon: Star },
        { label: "Liked", value: liked.length, icon: Heart },
        { label: "Watched", value: animeWatched, icon: Eye },
        { label: "Level", value: userLevel, icon: Zap },
      ];

  const saveProfile = async () => {
    localStorage.setItem("username", username);
    if (avatar) {
      try {
        const existing = localStorage.getItem("userAvatar");
        if (existing && existing.length > 10000) localStorage.removeItem("userAvatar");
        localStorage.setItem("userAvatar", avatar);
      } catch (e) {
        localStorage.removeItem("userAvatar");
        try { localStorage.setItem("userAvatar", avatar); } catch {}
      }
    } else {
      localStorage.removeItem("userAvatar");
    }
    if (banner) {
      try { localStorage.setItem("userBanner", banner); } catch {}
    } else {
      localStorage.removeItem("userBanner");
    }
    try {
      await authService.updateProfile({ username, avatar, bio: statusMsg });
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
            setRemoteUser(res.user);
            setUsername(res.user.username);
            setAvatar(res.user.avatar || '');
            setAvatarPreview(res.user.avatar || '');
            setStatusMsg(res.user.statusMessage || '');
          }
        } catch { /* ignore */ }
      })();
      loadTierLists();
    } else {
      const keys = ["userAvatar", "amv_edits", "amv_liked", "amv_saved"];
      keys.forEach(k => {
        try {
          const v = localStorage.getItem(k);
          if (v && v.length > 100000) localStorage.removeItem(k);
        } catch {}
      });
      loadProfileData();
      loadTierLists();
      const onLevelUp = (e) => {
        const { level } = e.detail;
        notify(`Level ${level}! You're on fire!`, "success");
      };
      window.addEventListener("level-up", onLevelUp);
      window.addEventListener("storage", loadProfileData);
      window.addEventListener("profile-avatar-updated", loadProfileData);
      window.addEventListener("user-status-updated", loadProfileData);
      window.addEventListener("watchlist-updated", loadProfileData);
      window.addEventListener("profile-data-changed", loadProfileData);
      window.addEventListener("progression-updated", loadProfileData);
      window.addEventListener("focus", loadProfileData);
      const interval = setInterval(loadProfileData, 5000);
      return () => {
        window.removeEventListener("level-up", onLevelUp);
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

  const handleBannerUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const r = String(reader.result || "");
      setBanner(r);
      setBannerPreview(r);
    };
    reader.readAsDataURL(file);
  };

  const generateAvatar = async () => {
    const apis = [
      "https://nekos.best/api/v2/neko",
      "https://nekos.best/api/v2/husbando",
      "https://api.waifu.pics/sfw/waifu",
    ].sort(() => Math.random() - 0.5);
    for (const api of apis) {
      try {
        const res = await fetch(api);
        const json = await res.json();
        let url = null;
        if (json.url) url = json.url;
        else if (json.results?.[0]?.url) url = json.results[0].url;
        if (url) {
          setAvatar(url);
          setAvatarPreview(url);
          return;
        }
      } catch {}
    }
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
          <div className="profile-hero-bg" style={bannerPreview || banner ? { backgroundImage: `url(${bannerPreview || banner})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
          {(bannerPreview || banner) && <div className="profile-hero-overlay" />}
          <div className="profile-hero-content">
            <div className={`profile-avatar-wrap ${(avatarPreview || avatar) ? "clickable" : ""}`} onClick={() => (avatarPreview || avatar) && setPreviewOpen(true)}>
              <div className="profile-aura-ring" style={{ background: `radial-gradient(circle, ${auraColor}33 0%, transparent 70%)`, boxShadow: `0 0 80px ${auraColor}22` }} />
              <div className="profile-avatar-circle" style={{ background: `linear-gradient(135deg, ${auraColor}, ${auraColor}dd)` }}>
                {avatarPreview || avatar ? (
                  <img src={avatarPreview || avatar} alt={username} />
                ) : (
                  <span>{username.charAt(0).toUpperCase()}</span>
                )}
              </div>
              {dominantGenre && <span className="profile-aura-label" style={{ background: auraColor }}>{dominantGenre}</span>}
            </div>

            {editing ? (
              <div className="profile-edit-area">
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="profile-input" />
                <div className="profile-edit-row">
                  <label className="profile-btn profile-btn-secondary">
                    Choose Avatar
                    <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
                  </label>
                  <button className="profile-btn profile-btn-secondary" onClick={generateAvatar}>Generate</button>
                  {avatar && <button className="profile-btn profile-btn-ghost" onClick={() => { setAvatar(""); setAvatarPreview(""); }}>Remove</button>}
                </div>
                  <div className="profile-edit-row">
                    <label className="profile-btn profile-btn-secondary">
                      Banner Image
                      <input type="file" accept="image/*" hidden onChange={handleBannerUpload} />
                    </label>
                    {banner && <button className="profile-btn profile-btn-ghost" onClick={() => { setBanner(""); setBannerPreview(""); }}>Remove Banner</button>}
                  </div>
                  <div className="profile-edit-row">
                    <button className="profile-btn profile-btn-primary" onClick={saveProfile}>Save</button>
                    <button className="profile-btn profile-btn-ghost" onClick={() => { setEditing(false); setUsername(localStorage.getItem("username") || "Anime Fan"); setAvatar(localStorage.getItem("userAvatar") || ""); setAvatarPreview(localStorage.getItem("userAvatar") || ""); setBanner(localStorage.getItem("userBanner") || ""); setBannerPreview(localStorage.getItem("userBanner") || ""); }}>Cancel</button>
                  </div>
              </div>
            ) : (
              <div className="profile-info-area clickable" onClick={() => setInfoOpen(true)}>
                <h1 className="profile-name">{username}</h1>
                <div className="profile-status-row">
                  {isRemoteProfile ? (
                    <span className="profile-status-text">{statusMsg}</span>
                  ) : editingStatus ? (
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
                            setStatusMsg(localStorage.getItem("userStatusMessage") || "");
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
                      <PenLine size={12} /> {statusMsg || "Set your status..."}
                    </button>
                  )}
                </div>
                <div className="profile-badges-row">
                  <span className="profile-badge">Member since {remoteUser?.memberSince || localStorage.getItem("memberSince") || new Date().getFullYear()}</span>
                  {isRemoteProfile && (
                    <span className="hud-clearance-badge">Level {userLevel} Otaku</span>
                  )}
                  {!isRemoteProfile && earnedBadges.slice(0, 4).map(b => (
                    <span key={b.key} className="profile-badge profile-badge-accent" title={b.desc}><BadgeIcon name={b.icon} size={10} /> {b.label}</span>
                  ))}
                </div>
                {!isRemoteProfile && (
                  <div className="profile-xp-row">
                    <div className="profile-xp-bar-track">
                      <div className="profile-xp-bar-fill" style={{ width: `${xpProgress}%` }} />
                    </div>
                    <div className="profile-xp-info">
                      <span className="profile-xp-level"><Zap size={12} /> Level {userLevel}</span>
                      <span className="profile-xp-streak">{streakData.current > 0 && <><Flame size={12} /> {streakData.current} day streak</>}</span>
                    </div>
                  </div>
                )}
                {currentWatch && (
                  <div className="profile-current-watch">
                    <div className="pcw-dot" />
                    <div className="pcw-info">
                      <span className="pcw-label">WATCHING</span>
                      <span className="pcw-title">{currentWatch.name}</span>
                      <span className="pcw-ep">Episode {currentWatch.episode}</span>
                    </div>
                    <div className="pcw-img">
                      <img src={currentWatch.img} alt={currentWatch.name} />
                    </div>
                  </div>
                )}
                {!isRemoteProfile && (
                  <div className="profile-actions-row">
                    <button className="profile-edit-trigger" onClick={() => setEditing(true)}><Settings size={14} /> Edit Profile</button>
                    <button className="profile-logout-trigger" onClick={async () => {
                      await authService.logout();
                      navigate("/");
                    }}><LogOut size={14} /> Sign Out</button>
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
              overview: watchlistAnime.length + likedAnime.length + ratedAnime.length,
              watchlist: watchlistAnime.length,
              ratings: ratedAnime.length,
              activity: history.length,
              tierlists: tierLists.length,
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
            {activeTab === "overview" && (
              <div className="tab-panel">
                <div className="overview-grid">
                  {!isRemoteProfile && (
                    <div className="overview-card overview-card--progression">
                      <h3><Zap size={12} /> Your Progression</h3>
                      <div className="prog-summary">
                        <div className="prog-level-circle">
                          <svg viewBox="0 0 80 80" className="prog-ring-svg">
                            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
                            <circle cx="40" cy="40" r="36" fill="none" stroke="#8b5cf6" strokeWidth="4"
                              strokeDasharray={`${(xpProgress / 100) * 226} 226`}
                              strokeLinecap="round" transform="rotate(-90 40 40)" />
                          </svg>
                          <span className="prog-level-num">{userLevel}</span>
                        </div>
                        <div className="prog-details">
                          <span className="prog-xp-text">{userXP} XP total</span>
                          <span className="prog-next-text">{Math.ceil(100 * userLevel ** 2) - userXP} XP to Level {userLevel + 1}</span>
                          {streakData.current > 0 && (
                            <span className="prog-streak-text"><Flame size={12} /> {streakData.current} day streak {streakData.longest > streakData.current && <>(best: {streakData.longest})</>}</span>
                          )}
                        </div>
                      </div>
                      <div className="prog-how">
                        <span className="prog-how-title">How to earn XP</span>
                        <div className="prog-how-list">
                          <span><Eye size={10} /> Watch an episode <strong>+10</strong></span>
                          <span><Star size={10} /> Rate an anime <strong>+5</strong></span>
                          <span><Bookmark size={10} /> Add to watchlist <strong>+3</strong></span>
                          <span><Heart size={10} /> Like an anime <strong>+2</strong></span>
                          <span><Zap size={10} /> Daily login bonus <strong>+20</strong></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isRemoteProfile && (() => {
                    const allDefs = getAllBadgeDefs();
                    const earnedKeys = new Set(earnedBadges.map(b => b.key));
                    return (
                      <div className="overview-card overview-card--badges">
                        <h3><Trophy size={12} /> Badges ({earnedBadges.length}/{Object.keys(allDefs).length})</h3>
                        <div className="badges-grid">
                          {Object.entries(allDefs).map(([key, def]) => {
                            const earned = earnedKeys.has(key);
                            return (
                              <div key={key} className={`badge-item ${earned ? 'earned' : 'locked'}`} title={def.desc}>
                                <span className="badge-icon"><BadgeIcon name={def.icon} size={14} /></span>
                                <span className="badge-label">{def.label}</span>
                                <span className="badge-desc">{def.desc}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

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

                  {dominantGenre && (
                    <div className="overview-card overview-card--aura">
                      <h3>Your Aura</h3>
                      <div className="aura-explain">
                        <div className="aura-color-swatch" style={{ background: auraColor }} />
                        <div className="aura-explain-text">
                          <strong>{dominantGenre} Aura</strong>
                          <span>Your profile glow is based on your most-watched genre. Watch more anime to shift your aura color.</span>
                        </div>
                      </div>
                    </div>
                  )}

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
                          <div key={a.id} className="recent-mini-item" onClick={() => navigate(`/anime/${a.id}/info`)}>
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

            {activeTab === "tierlists" && (
              <div className="tab-panel">
                <h3>Tier Lists ({tierLists.length})</h3>
                {tierListsLoading ? (
                  <div className="empty-state">
                    <p className="loading-text">Loading tier lists...</p>
                  </div>
                ) : tierLists.length > 0 ? (
                  <div className="tierlists-profile-grid">
                    {tierLists.map((list, i) => {
                      const ranked = Object.values(list.tiers || {}).reduce((s, arr) => s + (arr?.length || 0), 0);
                      return (
                        <motion.div
                          key={list._id}
                          className="tierlist-profile-card"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => navigate(`/arena/tier-lists/${list._id}`)}
                        >
                          <div className="tierlist-profile-card-header">
                            <h4>{list.title}</h4>
                            {list.isPublic ? (
                              <span className="tierlist-profile-badge public">Public</span>
                            ) : (
                              <span className="tierlist-profile-badge private">Private</span>
                            )}
                          </div>
                          <div className="tierlist-profile-card-meta">
                            <span>{ranked} ranked items</span>
                            <span>{new Date(list.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="tierlist-profile-card-tiers">
                            {Object.entries(list.tiers || {}).map(([tier, items]) =>
                              items?.length > 0 ? (
                                <span key={tier} className="tierlist-profile-tier-pill" data-tier={tier}>
                                  {tier.toUpperCase()}: {items.length}
                                </span>
                              ) : null
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : isRemoteProfile ? (
                  <div className="empty-state">
                    <Layers size={40} />
                    <p>No tier lists yet</p>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Layers size={40} />
                    <p>No tier lists yet</p>
                    <button className="profile-btn profile-btn-primary" onClick={() => navigate("/arena/tier-lists")}>
                      Create Tier List
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "community" && (
              <div className="tab-panel">
                <div className="community-grid">
                  <div className="community-section community-edits">
                    <div className="community-section-header">
                      <Sparkles size={14} />
                      <h3>AMVs & Edits</h3>
                    </div>
                    <div className="edits-content">
                      <div className="profile-edits-hero" onClick={() => navigate("/feeds/amvs")}>
                        <Video size={32} />
                        <div>
                          <strong>Explore Fan Creations</strong>
                          <span>AMVs, edits, and tributes from the community</span>
                        </div>
                      </div>
                      <div className="edits-stats">
                        <div className="edits-stat">
                          <strong>{totalEdits}</strong>
                          <span>Edits</span>
                        </div>
                        <div className="edits-stat">
                          <strong>{totalCreators}</strong>
                          <span>Creators</span>
                        </div>
                        <div className="edits-stat">
                          <strong>{totalViews}</strong>
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

        <AnimatePresence>
          {infoOpen && <ProfileInfoModal username={username} avatar={avatarPreview || avatar} onClose={() => setInfoOpen(false)} />}
        </AnimatePresence>

        {previewOpen && (avatarPreview || avatar) && (
          <div className="profile-preview-overlay" onClick={() => setPreviewOpen(false)}>
            <button className="profile-preview-close" onClick={() => setPreviewOpen(false)}><X size={16} /></button>
            <img src={avatarPreview || avatar} alt={username} className="profile-preview-img" />
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}

export function ProfileInfoModal({ username, avatar, onClose }) {
  const socialLinks = JSON.parse(localStorage.getItem('socialLinks') || '{}');
  return (
    <motion.div className="profile-info-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="profile-info-modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()}>
        <button className="profile-info-close" onClick={onClose}><X size={16} /></button>
        <div className="profile-info-avatar">
          {avatar ? <img src={avatar} alt={username} /> : <span>{username?.charAt(0)?.toUpperCase()}</span>}
        </div>
        <h2>{username}</h2>
        <div className="profile-info-details">
          <div className="profile-info-detail">
            <span>Member since</span>
            <strong>{localStorage.getItem('memberSince') || new Date().getFullYear()}</strong>
          </div>
          {socialLinks.instagram && (
            <div className="profile-info-detail">
              <span>Instagram</span>
              <strong><a href={`https://instagram.com/${socialLinks.instagram}`} target="_blank" rel="noopener noreferrer">@{socialLinks.instagram}</a></strong>
            </div>
          )}
          {socialLinks.twitter && (
            <div className="profile-info-detail">
              <span>Twitter / X</span>
              <strong><a href={`https://twitter.com/${socialLinks.twitter}`} target="_blank" rel="noopener noreferrer">@{socialLinks.twitter}</a></strong>
            </div>
          )}
          {socialLinks.discord && (
            <div className="profile-info-detail">
              <span>Discord</span>
              <strong>{socialLinks.discord}</strong>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}


