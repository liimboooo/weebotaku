import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getAnimeById } from "../data/animeData";
import { loadWatchlist, removeFromWatchlist, updateListStatus, loadRatings, loadWatchHistory } from "../services/storage";
import authService from "../services/authService";
import AnimatedPage from "../components/AnimatedPage";
import {
  Bookmark, Eye, Clock, CheckCircle, Pause, XCircle,
  Settings, Share2, UserPlus, X, Plus, Star, Edit3, Trash2,
  ExternalLink, Calendar, LogOut, ImagePlus, Search,
} from "lucide-react";
import "./ProfilePage.css";

const TABS = [
  { key: "all",       label: "All",       icon: Bookmark },
  { key: "Watching",  label: "Watching",  icon: Eye },
  { key: "Planning",  label: "Planning",  icon: Clock },
  { key: "Completed", label: "Completed", icon: CheckCircle },
  { key: "Paused",    label: "Paused",    icon: Pause },
  { key: "Dropped",   label: "Dropped",   icon: XCircle },
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
    if (stored) {
      const d = new Date(stored);
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      setJoinDate(`${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`);
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
            if (u.createdAt) {
              const d = new Date(u.createdAt);
              const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              setJoinDate(`${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`);
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

  const filteredAnime = useMemo(() => {
    let list = activeTab === "all" ? watchlist : watchlist.filter(w => w.listStatus === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(w => w.name?.toLowerCase().includes(q));
    }
    return list;
  }, [watchlist, activeTab, searchQuery]);

  const userAvatar = avatarPreview || avatar;
  const userInitial = username.charAt(0).toUpperCase();
  const handle = `@${(currentUser?.username || username).replace(/\s+/g, "")}`;

  return (
    <>
      <AnimatedPage>
        <div className="upp">
          {/* ── TOP SECTION ── */}
          <div className="upp-top">
            <div className="upp-top-inner">
              <div className="upp-user-card">
                <div className="upp-avatar-wrap">
                  <div className="upp-avatar" role="img" aria-label={`${username}'s avatar`}>
                    {userAvatar ? (
                      <img src={userAvatar} alt={username} />
                    ) : (
                      <span className="upp-avatar-initial">{userInitial}</span>
                    )}
                  </div>
                </div>
                <h1 className="upp-username">{username}</h1>
                <span className="upp-handle">{handle}</span>
                <span className="upp-joined">
                  <Calendar size={13} /> Joined {joinDate}
                </span>
              </div>

              <div className="upp-stats">
                <button className="upp-stat" onClick={() => setActiveTab("Completed")}>
                  <span className="upp-stat-number">{counts.Completed}</span>
                  <span className="upp-stat-label">COMPLETED</span>
                </button>
                <button className="upp-stat" onClick={() => setActiveTab("Watching")}>
                  <span className="upp-stat-number">{counts.Watching}</span>
                  <span className="upp-stat-label">WATCHING</span>
                </button>
                <button className="upp-stat" onClick={() => setActiveTab("Planning")}>
                  <span className="upp-stat-number">{counts.Planning}</span>
                  <span className="upp-stat-label">PLANNING</span>
                </button>
              </div>
            </div>

            <div className="upp-actions">
              {isOwnProfile && (
                <button className="upp-action-btn" onClick={() => setEditing(true)}>
                  <Settings size={14} /> Edit Profile
                </button>
              )}
              <button className="upp-action-btn" onClick={() => { if (navigator.share) navigator.share({ title: username, url: window.location.href }); else navigator.clipboard?.writeText(window.location.href); }}>
                <Share2 size={14} /> Share
              </button>
              {isRemoteProfile && (
                <button className="upp-action-btn upp-action-btn--follow">
                  <UserPlus size={14} /> Follow
                </button>
              )}
              {isOwnProfile && (
                <button className="upp-action-btn upp-action-btn--danger" onClick={async () => { await authService.logout(); navigate("/"); }}>
                  <LogOut size={14} /> Logout
                </button>
              )}
            </div>
          </div>

          {/* ── WATCHLIST SECTION ── */}
          <div className="upp-watchlist-section">
            <div className="upp-watchlist-inner">
              <div className="upp-watchlist-header">
                <h2 className="upp-watchlist-title">Watchlist</h2>
                <div className="upp-watchlist-header-right">
                  <span className="upp-watchlist-count">{filteredAnime.length} anime</span>
                  <div className="upp-search-box">
                    <Search size={14} />
                    <input
                      className="upp-search-input"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="upp-tabs" role="tablist">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    className={`upp-tab ${activeTab === key ? "active" : ""}`}
                    onClick={() => setActiveTab(key)}
                    role="tab"
                    aria-selected={activeTab === key}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                    <span className="upp-tab-count">({counts[key]})</span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="upp-skeleton-list">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div className="upp-skeleton-row" key={i}>
                      <div className="upp-skeleton-thumb" />
                      <div className="upp-skeleton-lines">
                        <div className="upp-skeleton-line upp-skeleton-line--med" />
                        <div className="upp-skeleton-line upp-skeleton-line--short" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredAnime.length > 0 ? (
                <div className="upp-list">
                  <AnimatePresence mode="popLayout">
                    {filteredAnime.map((item, i) => {
                      const userRating = rated[item.id];
                      return (
                        <motion.button
                          key={item.id}
                          className="upp-list-row"
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.02, duration: 0.2 }}
                          onClick={() => navigate(`/anime/${item.id}/info`)}
                        >
                          <div className="upp-list-img">
                            <img src={item.img} alt={item.name} loading="lazy" />
                          </div>
                          <div className="upp-list-info">
                            <h4 className="upp-list-title">{item.name}</h4>
                            <span className="upp-list-meta">
                              {item.status || "TV"}{item.episodes ? ` \u00b7 ${item.episodes} ep` : ""}
                            </span>
                          </div>
                          <span className={`upp-list-status upp-list-status--${item.listStatus?.toLowerCase()}`}>
                            {item.listStatus}
                          </span>
                          <div className="upp-list-rating">
                            {userRating ? (
                              <><Star size={12} fill="#667eea" color="#667eea" /> {userRating}</>
                            ) : (
                              <span className="upp-list-rating-empty">--</span>
                            )}
                          </div>
                          {isOwnProfile && (
                            <div className="upp-list-actions">
                              <button
                                className="upp-list-action"
                                onClick={(e) => { e.stopPropagation(); setShowStatusMenu(showStatusMenu === item.id ? null : item.id); }}
                                aria-label="Change status"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                className="upp-list-action upp-list-action--delete"
                                onClick={(e) => handleRemove(item.id, e)}
                                aria-label="Remove"
                              >
                                <Trash2 size={14} />
                              </button>
                              {showStatusMenu === item.id && (
                                <div className="upp-status-menu" onClick={e => e.stopPropagation()}>
                                  {STATUS_LIST.map(s => (
                                    <button
                                      key={s}
                                      className={`upp-status-opt ${item.listStatus === s ? "current" : ""}`}
                                      onClick={(e) => handleStatusChange(item.id, s, e)}
                                    >
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="upp-empty">
                  <div className="upp-empty-icon-bg">
                    <Bookmark size={60} />
                  </div>
                  <h3 className="upp-empty-title">No Anime Found</h3>
                  <p className="upp-empty-msg">
                    {searchQuery
                      ? `No results for "${searchQuery}".`
                      : activeTab === "all"
                        ? "This user's watchlist is empty."
                        : `No anime marked as "${activeTab}".`}
                  </p>
                  {isOwnProfile && activeTab === "all" && !searchQuery && (
                    <button className="upp-browse-btn" onClick={() => navigate("/browse/anime")}>
                      <Plus size={15} /> Browse Anime
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </AnimatedPage>

      {/* ── EDIT MODAL (outside AnimatedPage so position:fixed works) ── */}
      <AnimatePresence>
        {editing && (
          <motion.div
            className="upp-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditing(false)}
          >
            <motion.div
              className="upp-modal"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="upp-modal-head">
                <h3>Edit Profile</h3>
                <button className="upp-modal-close" onClick={() => setEditing(false)} aria-label="Close">
                  <X size={16} />
                </button>
              </div>
              <div className="upp-modal-body">
                <div className="upp-edit-avatar">
                  <div className="upp-edit-avatar-preview">
                    {userAvatar ? <img src={userAvatar} alt={username} /> : <span>{userInitial}</span>}
                  </div>
                  <div className="upp-edit-btns">
                    <label className="upp-btn-secondary">
                      Choose Avatar
                      <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
                    </label>
                    {avatar && (
                      <button className="upp-btn-ghost" onClick={() => { setAvatar(""); setAvatarPreview(""); }}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="upp-field">
                  <label>Banner</label>
                  <label className="upp-btn-secondary" style={{ width: "fit-content" }}>
                    <ImagePlus size={13} /> {banner ? "Change" : "Upload"}
                    <input type="file" accept="image/*" hidden onChange={handleBannerUpload} />
                  </label>
                </div>
                <div className="upp-field">
                  <label htmlFor="upp-edit-username">Username</label>
                  <input
                    id="upp-edit-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="upp-input"
                  />
                </div>
                <div className="upp-field">
                  <label htmlFor="upp-edit-bio">Status</label>
                  <textarea
                    id="upp-edit-bio"
                    value={statusMsg}
                    onChange={(e) => setStatusMsg(e.target.value)}
                    className="upp-textarea"
                    placeholder="What are you watching?"
                    maxLength={200}
                  />
                </div>
              </div>
              <div className="upp-modal-foot">
                <button className="upp-btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                <button className="upp-btn-primary" onClick={saveProfile}>Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
