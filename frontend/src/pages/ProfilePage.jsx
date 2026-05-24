import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getAnimeById } from "../data/animeData";
import { loadWatchlist, removeFromWatchlist, updateListStatus, loadRatings, loadWatchHistory } from "../services/storage";
import authService from "../services/authService";
import AnimatedPage from "../components/AnimatedPage";
import {
  Bookmark, Star, Plus, Settings, Share2, UserPlus, X,
  Edit3, Trash2, ExternalLink, Calendar, LogOut, Clock,
  CheckCircle, Play, Pause, XCircle, Search, ArrowUpDown,
  Activity, ImagePlus, Eye, Film, Heart, LayoutGrid, List,
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
  { key: "alpha",  label: "A-Z" },
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
  const [viewMode, setViewMode] = useState("list");

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
    setHistory(loadWatchHistory().slice(0, 8));
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
              setHistory(u.watchHistory.slice(0, 8).map(h => ({
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
  const userInitial = username.charAt(0).toUpperCase();
  const handle = `@${(currentUser?.username || username).toLowerCase().replace(/\s+/g, "")}`;

  return (
    <AnimatedPage>
      <div className="pp">
        {/* ── Hero ── */}
        <div className="pp-hero">
          <div className="pp-hero-grid" />
          <div className="pp-hero-shapes">
            <div className="pp-shape pp-shape--circle" />
            <div className="pp-shape pp-shape--triangle" />
            <div className="pp-shape pp-shape--square" />
            <div className="pp-shape pp-shape--dot" />
            <div className="pp-shape pp-shape--dot" />
            <div className="pp-shape pp-shape--dot" />
          </div>
        </div>

        <div className="pp-container">
          <div className="pp-layout">

            {/* ═══ SIDEBAR ═══ */}
            <aside className="pp-sidebar">
              <div className="pp-user-card">
                <div className="pp-avatar-wrap">
                  <div className="pp-avatar" role="img" aria-label={`${username}'s avatar`}>
                    {userAvatar ? (
                      <img src={userAvatar} alt={username} />
                    ) : (
                      <span className="pp-avatar-initial">{userInitial}</span>
                    )}
                    {totalAnime >= 10 && (
                      <span className="pp-avatar-badge">
                        {totalAnime >= 50 ? "PRO" : totalAnime >= 25 ? "VET" : "FAN"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="pp-user-info">
                  <h1 className="pp-username">{username}</h1>
                  <span className="pp-handle">{handle}</span>
                  <p className="pp-bio">
                    <span className="pp-bio-cursor">
                      {statusMsg || (isOwnProfile ? "Watching anime..." : "")}
                    </span>
                  </p>
                  <span className="pp-joined"><Calendar size={11} /> Joined {joinDate}</span>
                </div>
              </div>

              <div className="pp-sidebar-actions">
                {isOwnProfile && (
                  <button className="pp-action-btn" onClick={() => setEditing(true)}>
                    <Settings size={14} /> Edit
                  </button>
                )}
                <button
                  className="pp-action-btn"
                  onClick={() => {
                    if (navigator.share) navigator.share({ title: username, url: window.location.href });
                    else navigator.clipboard?.writeText(window.location.href);
                  }}
                >
                  <Share2 size={14} /> Share
                </button>
                {isRemoteProfile && (
                  <button className="pp-action-btn pp-action-btn--follow">
                    <UserPlus size={14} /> Follow
                  </button>
                )}
                {isOwnProfile && (
                  <button
                    className="pp-action-btn pp-action-btn--danger"
                    onClick={async () => { await authService.logout(); navigate("/"); }}
                  >
                    <LogOut size={14} /> Logout
                  </button>
                )}
              </div>

              <div className="pp-sidebar-stats">
                <button className="pp-sidebar-stat" onClick={() => setActiveTab("Completed")}>
                  <div className="pp-sidebar-stat-icon pp-sidebar-stat-icon--completed"><CheckCircle size={20} /></div>
                  <div className="pp-sidebar-stat-info">
                    <strong className="pp-sidebar-stat-number">{counts.Completed}</strong>
                    <span className="pp-sidebar-stat-label">Completed</span>
                  </div>
                </button>
                <button className="pp-sidebar-stat" onClick={() => setActiveTab("Watching")}>
                  <div className="pp-sidebar-stat-icon pp-sidebar-stat-icon--watching"><Eye size={20} /></div>
                  <div className="pp-sidebar-stat-info">
                    <strong className="pp-sidebar-stat-number">{counts.Watching}</strong>
                    <span className="pp-sidebar-stat-label">Watching</span>
                  </div>
                </button>
                <button className="pp-sidebar-stat" onClick={() => setActiveTab("Planning")}>
                  <div className="pp-sidebar-stat-icon pp-sidebar-stat-icon--planning"><Clock size={20} /></div>
                  <div className="pp-sidebar-stat-info">
                    <strong className="pp-sidebar-stat-number">{counts.Planning}</strong>
                    <span className="pp-sidebar-stat-label">Planning</span>
                  </div>
                </button>
                <button className="pp-sidebar-stat" onClick={() => {}}>
                  <div className="pp-sidebar-stat-icon pp-sidebar-stat-icon--episodes"><Film size={20} /></div>
                  <div className="pp-sidebar-stat-info">
                    <strong className="pp-sidebar-stat-number">{totalEps}</strong>
                    <span className="pp-sidebar-stat-label">Episodes</span>
                  </div>
                </button>
                <button className="pp-sidebar-stat" onClick={() => {}}>
                  <div className="pp-sidebar-stat-icon pp-sidebar-stat-icon--hours"><Heart size={20} /></div>
                  <div className="pp-sidebar-stat-info">
                    <strong className="pp-sidebar-stat-number">{hoursWatched}h</strong>
                    <span className="pp-sidebar-stat-label">Watched</span>
                  </div>
                </button>
              </div>
            </aside>

            {/* ═══ MAIN CONTENT ═══ */}
            <div className="pp-content">

              {/* ── Recent Activity ── */}
              {history.length > 0 && (
                <section className="pp-activity">
                  <h2 className="pp-section-label">Recent Activity</h2>
                  <div className="pp-activity-list">
                    {history.slice(0, 6).map((h, i) => {
                      const anime = loadedAnime[h.animeId];
                      const img = anime?.image || h.animeImg;
                      const name = anime?.name || h.animeName || "Unknown";
                      return (
                        <motion.div
                          key={`${h.animeId}-${h.timestamp}`}
                          className="pp-activity-item"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03, duration: 0.2 }}
                          onClick={() => navigate(`/anime/${h.animeId}/info?ep=${h.episode || 1}`)}
                        >
                          <div className="pp-activity-img">
                            {img && <img src={img} alt={name} loading="lazy" />}
                          </div>
                          <div className="pp-activity-info">
                            <p className="pp-activity-name">{name}</p>
                            <div className="pp-activity-meta">
                              <span className="pp-activity-ep-badge">EP {h.episode || 1}</span>
                              <span className="pp-activity-time">{timeAgoShort(h.timestamp)}</span>
                            </div>
                          </div>
                          <button
                            className="pp-activity-continue"
                            onClick={(e) => { e.stopPropagation(); navigate(`/anime/${h.animeId}/info?ep=${h.episode || 1}`); }}
                          >
                            Continue
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Watchlist ── */}
              <section className="pp-watchlist">
                <div className="pp-watchlist-header">
                  <h2 className="pp-watchlist-title">
                    Watchlist <span className="pp-watchlist-count">({totalAnime})</span>
                  </h2>
                  <div className="pp-toolbar">
                    <div className="pp-search-box">
                      <Search size={13} />
                      <input
                        className="pp-search-input"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div style={{ position: "relative" }}>
                      <button className="pp-sort-btn" onClick={() => setSortOpen(!sortOpen)}>
                        <ArrowUpDown size={12} /> {SORT_OPTIONS.find(s => s.key === sortBy)?.label}
                      </button>
                      {sortOpen && (
                        <div className="pp-status-menu" style={{ top: "calc(100% + 4px)", left: 0, right: "auto" }} onClick={e => e.stopPropagation()}>
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
                    <div className="pp-view-toggle">
                      <button
                        className={`pp-view-btn ${viewMode === "list" ? "active" : ""}`}
                        onClick={() => setViewMode("list")}
                        aria-label="List view"
                      >
                        <List size={14} />
                      </button>
                      <button
                        className={`pp-view-btn ${viewMode === "grid" ? "active" : ""}`}
                        onClick={() => setViewMode("grid")}
                        aria-label="Grid view"
                      >
                        <LayoutGrid size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="pp-tabs" role="tablist">
                  {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      className={`pp-tab ${activeTab === key ? "active" : ""}`}
                      onClick={() => setActiveTab(key)}
                      role="tab"
                      aria-selected={activeTab === key}
                    >
                      <Icon size={13} />
                      {label}
                      <span className="pp-tab-count">({counts[key]})</span>
                    </button>
                  ))}
                </div>

                {/* Content */}
                {loading ? (
                  <div className="pp-skeleton-list">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div className="pp-skeleton-row" key={i}>
                        <div className="pp-skeleton-thumb" />
                        <div className="pp-skeleton-lines">
                          <div className="pp-skeleton-line pp-skeleton-line--med" />
                          <div className="pp-skeleton-line pp-skeleton-line--short" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredAnime.length > 0 ? (
                  viewMode === "list" ? (
                    <div className="pp-list">
                      <div className="pp-list-header">
                        <span></span>
                        <span>Title</span>
                        <span>Status</span>
                        <span>Rating</span>
                        <span>Actions</span>
                      </div>
                      <AnimatePresence mode="popLayout">
                        {filteredAnime.map((item, i) => {
                          const userRating = rated[item.id];
                          return (
                            <motion.button
                              key={item.id}
                              className="pp-list-row"
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ delay: i * 0.02, duration: 0.2 }}
                              onClick={() => navigate(`/anime/${item.id}/info`)}
                            >
                              <div className="pp-list-img">
                                <img src={item.img} alt={item.name} loading="lazy" />
                              </div>
                              <div className="pp-list-title-col">
                                <h4 className="pp-list-title">{item.name}</h4>
                                <span className="pp-list-type">{item.status || "TV"}{item.episodes ? ` · ${item.episodes} ep` : ""}</span>
                              </div>
                              <div>
                                <span className={`pp-list-status pp-list-status--${item.listStatus?.toLowerCase()}`}>
                                  {item.listStatus}
                                </span>
                              </div>
                              <div className="pp-list-rating">
                                {userRating ? (
                                  <><Star size={11} fill="#fbbf24" /> {userRating}</>
                                ) : (
                                  <span style={{ color: "#333" }}>--</span>
                                )}
                              </div>
                              <div className="pp-list-actions">
                                {isOwnProfile && (
                                  <>
                                    <button
                                      className="pp-list-action"
                                      onClick={(e) => { e.stopPropagation(); setShowStatusMenu(showStatusMenu === item.id ? null : item.id); }}
                                      aria-label="Change status"
                                    >
                                      <Edit3 size={13} />
                                    </button>
                                    <button
                                      className="pp-list-action pp-list-action--delete"
                                      onClick={(e) => handleRemove(item.id, e)}
                                      aria-label="Remove"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </>
                                )}
                                <button
                                  className="pp-list-action"
                                  onClick={(e) => { e.stopPropagation(); navigate(`/anime/${item.id}/info`); }}
                                  aria-label="View"
                                >
                                  <ExternalLink size={13} />
                                </button>
                                {showStatusMenu === item.id && (
                                  <div className="pp-status-menu" style={{ position: "absolute", top: "100%", right: 0 }} onClick={e => e.stopPropagation()}>
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
                            </motion.button>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="pp-grid">
                      <AnimatePresence mode="popLayout">
                        {filteredAnime.map((item, i) => {
                          const userRating = rated[item.id];
                          return (
                            <motion.div
                              key={item.id}
                              className="pp-card"
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ delay: i * 0.02, duration: 0.2 }}
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
                                    {userRating && (
                                      <span className="pp-card-overlay-rating">
                                        <Star size={11} fill="#fbbf24" color="#fbbf24" /> {userRating}
                                      </span>
                                    )}
                                    {item.episodes && (
                                      <span className="pp-card-overlay-progress">{item.episodes} ep</span>
                                    )}
                                  </div>
                                  <div className="pp-card-overlay-actions">
                                    {isOwnProfile && (
                                      <>
                                        <button
                                          className="pp-card-action"
                                          onClick={(e) => { e.stopPropagation(); setShowStatusMenu(showStatusMenu === item.id ? null : item.id); }}
                                          aria-label="Change status"
                                        >
                                          <Edit3 size={12} />
                                        </button>
                                        <button
                                          className="pp-card-action pp-card-action--delete"
                                          onClick={(e) => handleRemove(item.id, e)}
                                          aria-label="Remove"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </>
                                    )}
                                    <button
                                      className="pp-card-action"
                                      onClick={(e) => { e.stopPropagation(); navigate(`/anime/${item.id}/info`); }}
                                      aria-label="View"
                                    >
                                      <ExternalLink size={12} />
                                    </button>
                                  </div>
                                </div>
                                {showStatusMenu === item.id && (
                                  <div className="pp-status-menu" style={{ position: "absolute", bottom: 0, left: 0, right: 0 }} onClick={e => e.stopPropagation()}>
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
                                <div className="pp-card-meta">
                                  <span className="pp-card-type">{item.status || "TV"}</span>
                                  {userRating && (
                                    <span className="pp-card-rating"><Star size={10} fill="#fbbf24" color="#fbbf24" /> {userRating}</span>
                                  )}
                                </div>
                                <span className={`pp-card-status-badge pp-card-status-badge--${item.listStatus?.toLowerCase()}`}>{item.listStatus}</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )
                ) : (
                  <div className="pp-empty">
                    <div className="pp-empty-icon"><Bookmark size={48} /></div>
                    <h3 className="pp-empty-title">
                      {searchQuery ? "No results" : "Nothing here yet"}
                    </h3>
                    <p className="pp-empty-msg">
                      {searchQuery
                        ? `No match for "${searchQuery}".`
                        : activeTab === "all"
                          ? "Start adding anime to your watchlist."
                          : `No anime marked as "${activeTab}".`}
                    </p>
                    {isOwnProfile && activeTab === "all" && !searchQuery && (
                      <button className="pp-btn-primary" onClick={() => navigate("/browse/anime")}>
                        <Plus size={14} /> Browse Anime
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>

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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="pp-modal-head">
                  <h3>Edit Profile</h3>
                  <button className="pp-modal-close" onClick={() => setEditing(false)} aria-label="Close"><X size={16} /></button>
                </div>
                <div className="pp-modal-body">
                  <div className="pp-edit-avatar">
                    <div className="pp-edit-avatar-preview">
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
                    <label>Banner</label>
                    <label className="pp-btn-secondary" style={{ width: "fit-content" }}>
                      <ImagePlus size={13} /> {banner ? "Change" : "Upload"}
                      <input type="file" accept="image/*" hidden onChange={handleBannerUpload} />
                    </label>
                  </div>
                  <div className="pp-field">
                    <label htmlFor="pp-edit-username">Username</label>
                    <input id="pp-edit-username" value={username} onChange={(e) => setUsername(e.target.value)} className="pp-input" />
                  </div>
                  <div className="pp-field">
                    <label htmlFor="pp-edit-bio">Status</label>
                    <textarea id="pp-edit-bio" value={statusMsg} onChange={(e) => setStatusMsg(e.target.value)} className="pp-textarea" placeholder="What are you watching?" maxLength={200} />
                  </div>
                </div>
                <div className="pp-modal-foot">
                  <button className="pp-btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                  <button className="pp-btn-primary" onClick={saveProfile}>Save</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
