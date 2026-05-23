import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getAnimeById } from "../data/animeData";
import { loadWatchlist, removeFromWatchlist, updateListStatus, loadRatings, loadWatchHistory } from "../services/storage";
import authService from "../services/authService";
import AnimatedPage from "../components/AnimatedPage";
import {
  Bookmark, Star, Eye, Plus, Settings, Share2, UserPlus, X,
  Edit3, Trash2, ExternalLink, Calendar, LogOut, Clock,
  CheckCircle, Play, Pause, XCircle, Search, ArrowUpDown,
  Activity, ImagePlus,
} from "lucide-react";
import "./ProfilePage.css";

const TABS = [
  { key: "all",       label: "All",       icon: Bookmark },
  { key: "Watching",  label: "Watching",  icon: Play },
  { key: "Planning",  label: "Planning",  icon: Clock },
  { key: "Completed", label: "Completed", icon: CheckCircle },
  { key: "Paused",    label: "Paused",    icon: Pause },
  { key: "Dropped",   label: "Dropped",   icon: XCircle },
];

const STATUS_LIST = ["Watching", "Planning", "Completed", "Paused", "Dropped"];

const SORT_OPTIONS = [
  { key: "recent", label: "Recent" },
  { key: "alpha",  label: "A–Z" },
  { key: "rating", label: "Rating" },
];

function timeAgoShort(ts) {
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

export default function ProfilePage() {
  const navigate = useNavigate();
  const { username: profileUsername } = useParams();
  const currentUser = authService.getCurrentUser();
  const isRemoteProfile = profileUsername && profileUsername !== currentUser?.username;
  const isOwnProfile = !isRemoteProfile;

  const [username, setUsername] = useState("Anime Fan");
  const [avatar, setAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [banner, setBanner] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [watchlist, setWatchlist] = useState([]);
  const [rated, setRated] = useState({});
  const [history, setHistory] = useState([]);
  const [loadedAnime, setLoadedAnime] = useState({});
  const [showStatusMenu, setShowStatusMenu] = useState(null);
  const [joinDate, setJoinDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [sortOpen, setSortOpen] = useState(false);

  const loadProfileData = useCallback(() => {
    if (isRemoteProfile) return;
    const userData = authService.getCurrentUser();
    if (userData) {
      setUsername(userData.username || "Anime Fan");
      if (userData.avatar) { setAvatar(userData.avatar); setAvatarPreview(userData.avatar); }
      if (userData.banner) { setBanner(userData.banner); setBannerPreview(userData.banner); }
      if (userData.statusMessage) setStatusMsg(userData.statusMessage);
    }
    setWatchlist(loadWatchlist());
    setRated(loadRatings());
    setHistory(loadWatchHistory().slice(0, 15));
    setLoading(false);
  }, [isRemoteProfile]);

  useEffect(() => {
    const ids = new Set();
    watchlist.forEach(item => ids.add(item.id));
    Object.keys(rated).forEach(id => ids.add(parseInt(id)));
    history.forEach(h => ids.add(h.animeId));
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
  }, [watchlist, rated, history]);

  useEffect(() => {
    const stored = currentUser?.memberSince;
    setJoinDate(stored ? String(stored) : new Date().getFullYear().toString());
  }, [currentUser?.memberSince]);

  useEffect(() => {
    if (isRemoteProfile) {
      setLoading(true);
      (async () => {
        try {
          const res = await authService.getUserByUsername(profileUsername);
          if (res.success && res.user) {
            const u = res.user;
            setUsername(u.username);
            setAvatar(u.avatar || ""); setAvatarPreview(u.avatar || "");
            if (u.banner) { setBanner(u.banner); setBannerPreview(u.banner); }
            if (u.statusMessage) setStatusMsg(u.statusMessage);
            if (u.watchlist) {
              setWatchlist(u.watchlist.map(item => ({
                id: item.animeId, name: item.name, img: item.img,
                rating: item.rating, episodes: item.episodes,
                year: item.year, status: item.status, genres: item.genres || [],
                listStatus: item.listStatus || "Watch Later", type: "anime",
              })));
            }
            if (u.ratings) setRated(u.ratings);
            if (u.watchHistory) {
              setHistory(u.watchHistory.slice(0, 15).map(h => ({
                animeId: h.animeId, episode: h.episode,
                timestamp: new Date(h.timestamp).getTime(),
                animeName: h.animeName || "", animeImg: h.animeImg || "",
              })));
            }
            if (u.createdAt) setJoinDate(new Date(u.createdAt).getFullYear().toString());
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
      await authService.updateProfile({ username, avatar, banner, statusMessage: statusMsg });
    } catch {}
    window.dispatchEvent(new Event("profile-avatar-updated"));
    setEditing(false);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const r = String(reader.result || ""); setAvatar(r); setAvatarPreview(r); };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const r = String(reader.result || ""); setBanner(r); setBannerPreview(r); };
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

  const totalAnime = watchlist.length;
  const totalEps = history.length;
  const hoursWatched = Math.round(totalEps * 24 / 60);

  const filteredAnime = useMemo(() => {
    let list = activeTab === "all" ? watchlist : watchlist.filter(w => w.listStatus === activeTab);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(w => w.name?.toLowerCase().includes(q));
    }

    if (sortBy === "alpha") list = [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else if (sortBy === "rating") list = [...list].sort((a, b) => (rated[b.id] || 0) - (rated[a.id] || 0));

    return list;
  }, [watchlist, activeTab, searchQuery, sortBy, rated]);

  const userAvatar = avatarPreview || avatar;
  const userBanner = bannerPreview || banner;
  const userInitial = username.charAt(0).toUpperCase();
  const handle = `@${(currentUser?.username || username).toLowerCase().replace(/\s+/g, "")}`;

  const statBarMax = Math.max(counts.Completed, counts.Watching, counts.Planning, 1);

  return (
    <AnimatedPage>
      <div className="pp">
        <div className="pp-bg-glow" />

        {/* ══════ HEADER ══════ */}
        <header className="pp-header">
          <div className="pp-banner">
            {userBanner ? (
              <img src={userBanner} alt="" />
            ) : (
              <div className="pp-banner-fallback" />
            )}
            <div className="pp-banner-overlay" />
          </div>

          <div className="pp-header-inner">
            <div className="pp-header-left">
              <div className="pp-avatar-wrap">
                <div className="pp-avatar-ring" />
                <div className="pp-avatar" role="img" aria-label={`${username}'s avatar`}>
                  {userAvatar ? (
                    <img src={userAvatar} alt={username} />
                  ) : (
                    <span className="pp-avatar-initial">{userInitial}</span>
                  )}
                </div>
              </div>

              <div className="pp-info-card">
                <h1 className="pp-username">{username}</h1>
                <span className="pp-handle">{handle}</span>
                {statusMsg && <p className="pp-bio">{statusMsg}</p>}
                <span className="pp-joined"><Calendar size={12} /> Joined {joinDate}</span>
              </div>
            </div>

            <div className="pp-actions">
              {isOwnProfile && (
                <button className="pp-btn-icon" onClick={() => setEditing(true)} aria-label="Edit Profile">
                  <Settings size={18} />
                  <span className="pp-tooltip">Settings</span>
                </button>
              )}
              <button
                className="pp-btn-icon"
                onClick={() => {
                  if (navigator.share) navigator.share({ title: username, url: window.location.href });
                  else navigator.clipboard?.writeText(window.location.href);
                }}
                aria-label="Share Profile"
              >
                <Share2 size={18} />
                <span className="pp-tooltip">Share</span>
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
                  <LogOut size={14} /> Logout
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ══════ STATS ══════ */}
        <div className="pp-stats">
          <div className="pp-stat" onClick={() => setActiveTab("Completed")}>
            <div className="pp-stat-icon pp-stat-icon--completed"><CheckCircle size={18} /></div>
            <strong className="pp-stat-number">{counts.Completed}</strong>
            <span className="pp-stat-label">Completed</span>
            <div className="pp-stat-bar">
              <div className="pp-stat-bar-fill pp-stat-bar-fill--completed" style={{ width: `${(counts.Completed / statBarMax) * 100}%` }} />
            </div>
          </div>
          <div className="pp-stat" onClick={() => setActiveTab("Watching")}>
            <div className="pp-stat-icon pp-stat-icon--watching"><Play size={18} /></div>
            <strong className="pp-stat-number">{counts.Watching}</strong>
            <span className="pp-stat-label">Watching</span>
            <div className="pp-stat-bar">
              <div className="pp-stat-bar-fill pp-stat-bar-fill--watching" style={{ width: `${(counts.Watching / statBarMax) * 100}%` }} />
            </div>
          </div>
          <div className="pp-stat" onClick={() => setActiveTab("Planning")}>
            <div className="pp-stat-icon pp-stat-icon--planning"><Clock size={18} /></div>
            <strong className="pp-stat-number">{counts.Planning}</strong>
            <span className="pp-stat-label">Planning</span>
            <div className="pp-stat-bar">
              <div className="pp-stat-bar-fill pp-stat-bar-fill--planning" style={{ width: `${(counts.Planning / statBarMax) * 100}%` }} />
            </div>
          </div>
          <div className="pp-stat">
            <div className="pp-stat-icon pp-stat-icon--episodes"><Eye size={18} /></div>
            <strong className="pp-stat-number">{totalEps}</strong>
            <span className="pp-stat-label">Episodes</span>
          </div>
          <div className="pp-stat">
            <div className="pp-stat-icon pp-stat-icon--hours"><Star size={18} /></div>
            <strong className="pp-stat-number">{hoursWatched}h</strong>
            <span className="pp-stat-label">Watched</span>
          </div>
        </div>

        {/* ══════ MAIN ══════ */}
        <main className="pp-main">

          {/* ── Recent Activity ── */}
          {history.length > 0 && (
            <section className="pp-activity">
              <div className="pp-activity-header">
                <h2><Activity size={20} /> Recent Activity</h2>
              </div>
              <div className="pp-activity-scroll">
                {history.map((h, i) => {
                  const anime = loadedAnime[h.animeId];
                  const img = anime?.image || h.animeImg;
                  const name = anime?.name || h.animeName || "Unknown";
                  return (
                    <motion.div
                      key={`${h.animeId}-${h.timestamp}`}
                      className="pp-activity-card"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.3 }}
                      onClick={() => navigate(`/anime/${h.animeId}/info?ep=${h.episode || 1}`)}
                    >
                      <div className="pp-activity-poster">
                        {img && <img src={img} alt={name} loading="lazy" />}
                        <span className="pp-activity-ep">EP {h.episode || 1}</span>
                      </div>
                      <div className="pp-activity-body">
                        <p className="pp-activity-title">{name}</p>
                        <span className="pp-activity-time">{timeAgoShort(h.timestamp)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Watchlist ── */}
          <section className="pp-section">
            <div className="pp-section-header">
              <h2 className="pp-section-title">
                <Bookmark size={20} /> Watchlist <span className="pp-section-count">{totalAnime} anime</span>
              </h2>
              <div className="pp-toolbar">
                <div className="pp-search-box">
                  <Search size={14} />
                  <input
                    className="pp-search-input"
                    placeholder="Search watchlist..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div style={{ position: "relative" }}>
                  <button className="pp-sort-btn" onClick={() => setSortOpen(!sortOpen)}>
                    <ArrowUpDown size={13} /> {SORT_OPTIONS.find(s => s.key === sortBy)?.label}
                  </button>
                  {sortOpen && (
                    <div className="pp-status-menu" style={{ bottom: "auto", top: "calc(100% + 4px)", left: 0, right: "auto", minWidth: 100 }} onClick={e => e.stopPropagation()}>
                      {SORT_OPTIONS.map(s => (
                        <button
                          key={s.key}
                          className={`pp-status-opt ${sortBy === s.key ? "current" : ""}`}
                          onClick={() => { setSortBy(s.key); setSortOpen(false); }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="pp-tabs" role="tablist" aria-label="Watchlist status filter">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className={`pp-tab ${activeTab === key ? "active" : ""}`}
                  onClick={() => setActiveTab(key)}
                  role="tab"
                  aria-selected={activeTab === key}
                  aria-label={`${label} (${counts[key]})`}
                >
                  <Icon size={14} />
                  {label}
                  <span className="pp-tab-count">{counts[key]}</span>
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
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.92 }}
                        transition={{ delay: i * 0.025, duration: 0.3 }}
                        tabIndex={0}
                        role="button"
                        aria-label={`${item.name} — ${item.listStatus}`}
                        onClick={() => navigate(`/anime/${item.id}/info`)}
                        onKeyDown={(e) => { if (e.key === "Enter") navigate(`/anime/${item.id}/info`); }}
                      >
                        <div className="pp-card-poster">
                          <img src={item.img} alt={item.name} loading="lazy" />
                          <div className="pp-card-overlay">
                            <span className="pp-card-overlay-title">{item.name}</span>
                            <div className="pp-card-overlay-info">
                              <span className="pp-card-overlay-badge">{item.status || "TV"}</span>
                              {userRating && (
                                <span className="pp-card-overlay-rating">
                                  <Star size={11} fill="#ffd700" color="#ffd700" /> {userRating}
                                </span>
                              )}
                              {item.episodes && (
                                <span className="pp-card-overlay-badge">{item.episodes} ep</span>
                              )}
                            </div>
                            <div className="pp-card-overlay-actions">
                              {isOwnProfile && (
                                <>
                                  <button
                                    className="pp-card-action pp-card-action--edit"
                                    onClick={(e) => { e.stopPropagation(); setShowStatusMenu(showStatusMenu === item.id ? null : item.id); }}
                                    aria-label="Change status"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    className="pp-card-action pp-card-action--delete"
                                    onClick={(e) => handleRemove(item.id, e)}
                                    aria-label="Remove from watchlist"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                              <button
                                className="pp-card-action pp-card-action--view"
                                onClick={(e) => { e.stopPropagation(); navigate(`/anime/${item.id}/info`); }}
                                aria-label="View details"
                              >
                                <ExternalLink size={13} />
                              </button>
                            </div>
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
                              <span className="pp-card-rating"><Star size={11} fill="#ffd700" color="#ffd700" /> {userRating}</span>
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
                  {searchQuery
                    ? `No results for "${searchQuery}".`
                    : activeTab === "all"
                      ? "This watchlist is empty. Start adding anime to build your collection."
                      : `No anime with status "${activeTab}".`}
                </p>
                {isOwnProfile && activeTab === "all" && !searchQuery && (
                  <button className="pp-btn-primary" onClick={() => navigate("/browse/anime")}>
                    <Plus size={16} /> Browse Anime
                  </button>
                )}
              </div>
            )}
          </section>
        </main>

        {/* ══════ EDIT MODAL ══════ */}
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
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
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
                    <label>Banner Image</label>
                    <label className="pp-btn-secondary" style={{ width: "fit-content" }}>
                      <ImagePlus size={14} /> {banner ? "Change Banner" : "Upload Banner"}
                      <input type="file" accept="image/*" hidden onChange={handleBannerUpload} />
                    </label>
                  </div>
                  <div className="pp-field">
                    <label htmlFor="pp-edit-username">Username</label>
                    <input id="pp-edit-username" value={username} onChange={(e) => setUsername(e.target.value)} className="pp-input" />
                  </div>
                  <div className="pp-field">
                    <label htmlFor="pp-edit-bio">Bio / Status</label>
                    <textarea id="pp-edit-bio" value={statusMsg} onChange={(e) => setStatusMsg(e.target.value)} className="pp-textarea" placeholder="Tell others about yourself..." maxLength={200} />
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
