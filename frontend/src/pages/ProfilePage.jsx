import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getAnimeById } from "../data/animeData";
import { loadWatchlist, removeFromWatchlist, updateListStatus, loadLikedAnime, loadRatings, loadWatchHistory } from "../services/storage";
import authService from "../services/authService";
import AnimatedPage from "../components/AnimatedPage";
import { Bookmark, Star, Eye, Plus, Settings, Share2, UserPlus, X, Edit3, Trash2, ExternalLink, Calendar, LogOut } from "lucide-react";
import "./ProfilePage.css";

const TABS = [
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
  const [rated, setRated] = useState({});
  const [loadedAnime, setLoadedAnime] = useState({});
  const [remoteUser, setRemoteUser] = useState(null);
  const [showStatusMenu, setShowStatusMenu] = useState(null);
  const [joinDate, setJoinDate] = useState("");
  const [loading, setLoading] = useState(true);

  const loadProfileData = () => {
    if (isRemoteProfile) return;
    const userData = authService.getCurrentUser();
    if (userData) {
      setUsername(userData.username || "Anime Fan");
      if (userData.avatar) { setAvatar(userData.avatar); setAvatarPreview(userData.avatar); }
    }
    setWatchlist(loadWatchlist());
    setRated(loadRatings());
    setLoading(false);
  };

  useEffect(() => {
    const ids = new Set();
    watchlist.forEach(item => ids.add(item.id));
    Object.keys(rated).forEach(id => ids.add(parseInt(id)));
    const idsArr = [...ids].filter(Boolean);
    if (idsArr.length === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(idsArr.map(id => getAnimeById(id)));
      if (cancelled) return;
      const map = {};
      idsArr.forEach((id, i) => { if (results[i]) map[id] = results[i]; });
      setLoadedAnime(prev => ({ ...prev, ...map }));
    })();
    return () => { cancelled = true; };
  }, [watchlist, rated]);

  useEffect(() => {
    const stored = currentUser?.memberSince;
    if (stored) {
      setJoinDate(String(stored));
    } else {
      setJoinDate(new Date().getFullYear().toString());
    }
  }, [currentUser?.memberSince]);

  useEffect(() => {
    if (isRemoteProfile) {
      setLoading(true);
      (async () => {
        try {
          const res = await authService.getUserByUsername(profileUsername);
          if (res.success && res.user) {
            const u = res.user;
            setRemoteUser(u);
            setUsername(u.username);
            setAvatar(u.avatar || "");
            setAvatarPreview(u.avatar || "");
            if (u.watchlist) {
              setWatchlist(u.watchlist.map(item => ({
                id: item.animeId, name: item.name, img: item.img,
                rating: item.rating, episodes: item.episodes,
                year: item.year, status: item.status, genres: item.genres || [],
                listStatus: item.listStatus || "Watch Later", type: "anime",
              })));
            }
            if (u.ratings) setRated(u.ratings);
            if (u.createdAt) {
              setJoinDate(new Date(u.createdAt).getFullYear().toString());
            }
          }
        } catch {}
        setLoading(false);
      })();
    } else {
      loadProfileData();
      window.addEventListener("watchlist-updated", loadProfileData);
      window.addEventListener("profile-data-changed", loadProfileData);
      window.addEventListener("profile-avatar-updated", loadProfileData);
      return () => {
        window.removeEventListener("watchlist-updated", loadProfileData);
        window.removeEventListener("profile-data-changed", loadProfileData);
        window.removeEventListener("profile-avatar-updated", loadProfileData);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUsername]);

  const saveProfile = async () => {
    try {
      await authService.updateProfile({ username, avatar });
    } catch {}
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

  const handleRemove = (animeId, e) => {
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

  const counts = useMemo(() => ({
    all: watchlist.length,
    Watching: watchlist.filter(w => w.listStatus === "Watching").length,
    Planning: watchlist.filter(w => w.listStatus === "Planning").length,
    Completed: watchlist.filter(w => w.listStatus === "Completed").length,
    Paused: watchlist.filter(w => w.listStatus === "Paused").length,
    Dropped: watchlist.filter(w => w.listStatus === "Dropped").length,
  }), [watchlist]);

  const filteredAnime = activeTab === "all"
    ? watchlist
    : watchlist.filter(w => w.listStatus === activeTab);

  const userAvatar = avatarPreview || avatar;
  const userInitial = username.charAt(0).toUpperCase();
  const handle = `@${(currentUser?.username || username).toLowerCase().replace(/\s+/g, "")}`;

  return (
    <AnimatedPage>
      <div className="pp">
        <div className="pp-bg-glow" />

        {/* ── Header ── */}
        <header className="pp-header">
          <div className="pp-header-inner">
            <div className="pp-header-left">
              <div className="pp-avatar" role="img" aria-label={`${username}'s avatar`}>
                {userAvatar ? (
                  <img src={userAvatar} alt={username} />
                ) : (
                  <span className="pp-avatar-initial">{userInitial}</span>
                )}
              </div>
              <div className="pp-info">
                <h1 className="pp-username">{username}</h1>
                <span className="pp-handle">{handle}</span>
                <span className="pp-joined"><Calendar size={12} /> Joined {joinDate}</span>
              </div>
            </div>

            <div className="pp-actions">
              {isOwnProfile && (
                <button className="pp-btn-icon" onClick={() => setEditing(true)} title="Settings" aria-label="Edit Profile">
                  <Settings size={18} />
                </button>
              )}
              <button
                className="pp-btn-icon"
                onClick={() => {
                  if (navigator.share) navigator.share({ title: username, url: window.location.href });
                  else navigator.clipboard?.writeText(window.location.href);
                }}
                title="Share"
                aria-label="Share Profile"
              >
                <Share2 size={18} />
              </button>
              {isRemoteProfile && (
                <button className="pp-btn-follow" aria-label="Follow User">
                  <UserPlus size={16} /> Follow
                </button>
              )}
              {isOwnProfile && (
                <button
                  className="pp-btn-logout"
                  onClick={async () => { await authService.logout(); navigate("/"); }}
                  aria-label="Sign Out"
                >
                  Logout
                </button>
              )}
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="pp-stats">
            <div className="pp-stat">
              <strong className="pp-stat-number">{counts.Completed}</strong>
              <span className="pp-stat-label">Completed</span>
            </div>
            <div className="pp-stat">
              <strong className="pp-stat-number">{counts.Watching}</strong>
              <span className="pp-stat-label">Watching</span>
            </div>
            <div className="pp-stat">
              <strong className="pp-stat-number">{counts.Planning}</strong>
              <span className="pp-stat-label">Planning</span>
            </div>
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="pp-main">
          <section className="pp-section">
            <div className="pp-section-header">
              <h2><Bookmark size={20} /> Watchlist <span className="pp-section-count">{watchlist.length} anime</span></h2>
            </div>

            {/* Tabs */}
            <div className="pp-tabs" role="tablist" aria-label="Watchlist status filter">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  className={`pp-tab ${activeTab === key ? "active" : ""}`}
                  onClick={() => setActiveTab(key)}
                  role="tab"
                  aria-selected={activeTab === key}
                  aria-label={`${label} (${counts[key]})`}
                >
                  {label} <span className="pp-tab-count">({counts[key]})</span>
                </button>
              ))}
            </div>

            {/* Grid */}
            {loading ? (
              <div className="pp-skeleton-grid">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div className="pp-skeleton-card" key={i}>
                    <div className="pp-skeleton-poster" />
                    <div className="pp-skeleton-body">
                      <div className="pp-skeleton-line" />
                      <div className="pp-skeleton-line pp-skeleton-line--short" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAnime.length > 0 ? (
              <div className="pp-grid">
                <AnimatePresence mode="popLayout">
                  {filteredAnime.map((item, i) => {
                    const userRating = rated[item.id];
                    return (
                      <motion.div
                        key={item.id}
                        className="pp-card"
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: i * 0.03, duration: 0.25 }}
                        tabIndex={0}
                        role="button"
                        aria-label={`${item.name} — ${item.listStatus}`}
                        onClick={() => navigate(`/anime/${item.id}/info`)}
                        onKeyDown={(e) => { if (e.key === "Enter") navigate(`/anime/${item.id}/info`); }}
                      >
                        <div className="pp-card-poster">
                          <img src={item.img} alt={item.name} loading="lazy" />
                          <div className="pp-card-overlay">
                            {isOwnProfile && (
                              <>
                                <button
                                  className="pp-card-action pp-card-action--edit"
                                  onClick={(e) => { e.stopPropagation(); setShowStatusMenu(showStatusMenu === item.id ? null : item.id); }}
                                  aria-label="Change status"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  className="pp-card-action pp-card-action--delete"
                                  onClick={(e) => handleRemove(item.id, e)}
                                  aria-label="Remove from watchlist"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                            <button
                              className="pp-card-action pp-card-action--view"
                              onClick={(e) => { e.stopPropagation(); navigate(`/anime/${item.id}/info`); }}
                              aria-label="View details"
                            >
                              <ExternalLink size={14} />
                            </button>
                          </div>
                          {showStatusMenu === item.id && (
                            <div className="pp-status-menu" onClick={e => e.stopPropagation()}>
                              {STATUS_LIST.map(s => (
                                <button
                                  key={s}
                                  className={`pp-status-opt ${item.listStatus === s ? "current" : ""}`}
                                  onClick={(e) => handleStatusChange(item.id, s, e)}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="pp-card-body">
                          <h4 className="pp-card-title">{item.name}</h4>
                          <span className="pp-card-type">{item.status || "TV"}</span>
                          <div className="pp-card-meta">
                            {userRating && (
                              <span className="pp-card-rating"><Star size={12} fill="#ffd700" color="#ffd700" /> {userRating}</span>
                            )}
                            {item.listStatus === "Watching" && item.episodes && (
                              <span><Eye size={12} /> Ep {item.episodes}</span>
                            )}
                          </div>
                          <span className={`pp-card-status pp-status-${item.listStatus?.toLowerCase()}`}>{item.listStatus}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="pp-empty">
                <div className="pp-empty-icon"><Bookmark size={80} /></div>
                <h3 className="pp-empty-title">No Anime Found</h3>
                <p className="pp-empty-msg">
                  {activeTab === "all"
                    ? "This user's watchlist is empty."
                    : `No anime with status "${activeTab}".`}
                </p>
                {isOwnProfile && activeTab === "all" && (
                  <button className="pp-btn-primary" onClick={() => navigate("/browse/anime")}>
                    <Plus size={16} /> Browse Anime
                  </button>
                )}
              </div>
            )}
          </section>
        </main>

        {/* ── Edit Profile Modal ── */}
        <AnimatePresence>
          {editing && (
            <motion.div
              className="pp-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditing(false)}
            >
              <motion.div
                className="pp-modal"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="pp-modal-head">
                  <h3>Edit Profile</h3>
                  <button className="pp-modal-close" onClick={() => setEditing(false)} aria-label="Close"><X size={18} /></button>
                </div>
                <div className="pp-modal-body">
                  <div className="pp-edit-avatar">
                    <div className="pp-edit-avatar-circle">
                      {userAvatar ? <img src={userAvatar} alt={username} /> : <span>{userInitial}</span>}
                    </div>
                    <div className="pp-edit-btns">
                      <label className="pp-btn-secondary">
                        Choose Avatar
                        <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
                      </label>
                      {avatar && <button className="pp-btn-ghost" onClick={() => { setAvatar(""); setAvatarPreview(""); }}>Remove</button>}
                    </div>
                  </div>
                  <div className="pp-field">
                    <label htmlFor="pp-edit-username">Username</label>
                    <input
                      id="pp-edit-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pp-input"
                    />
                  </div>
                </div>
                <div className="pp-modal-foot">
                  <button className="pp-btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                  <button className="pp-btn-primary" onClick={saveProfile}>Save Changes</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
