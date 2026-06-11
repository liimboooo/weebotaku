import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { removeFromWatchlist, updateListStatus, loadWatchlist, loadWatchHistory } from "../services/storage";
import authService from "../services/authService";
import { setPolledRemoteUserId } from "../services/socket";
import AnimatedPage from "../components/AnimatedPage";
import { MAX_FAVORITES } from "../utils/constants";
import {
  Bookmark, Eye, Clock, CheckCircle, Pause, XCircle,
  Share2, Plus, Star, Edit3, Trash2,
  Calendar, LogOut, Search, Settings,
  Heart, Film, BookOpen, Globe, MessageCircle,
} from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";
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

const SOCIAL_ICONS = {
  twitter: MessageCircle,
  instagram: Globe,
  discord: MessageCircle,
  myanimelist: BookOpen,
  anilist: Film,
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { username: profileUsername } = useParams();
  const currentUser = authService.getCurrentUser();
  const isRemoteProfile = profileUsername && profileUsername !== currentUser?.username;
  const isOwnProfile = !isRemoteProfile;
  useDocumentTitle(isRemoteProfile ? `${profileUsername}'s Profile` : "My Profile");

  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");

  const [activeTab, setActiveTab] = useState("all");
  const [watchlist, setWatchlist] = useState([]);
  const [rated, setRated] = useState({});
  const [showStatusMenu, setShowStatusMenu] = useState(null);
  const [joinDate, setJoinDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [socialLinks, setSocialLinks] = useState({});
  const [userResults, setUserResults] = useState([]);
  const [remoteUserId, setRemoteUserId] = useState(null);
  const [recentHistory, setRecentHistory] = useState([]);

  const loadProfileData = useCallback(async () => {
    if (isRemoteProfile) return;
    setLoading(true);
    try {
      const res = await authService.getMe();
      if (res.success && res.user) {
        const u = res.user;
        setUsername(u.username || "Deleted User");
        if (u.avatar) { setAvatar(u.avatar); setAvatarPreview(u.avatar); }
        // Merge backend watchlist with localStorage for immediate sync
        const localWatchlist = loadWatchlist();
        if (u.watchlist && u.watchlist.length > 0) {
          const merged = u.watchlist.map(item => ({
            id: item.animeId, name: item.name, img: item.img,
            rating: item.rating, episodes: item.episodes,
            year: item.year, status: item.status, genres: item.genres || [],
            listStatus: item.listStatus || "Planning", type: "anime",
          }));
          // Add local-only items not yet on backend
          localWatchlist.forEach(local => {
            if (!merged.some(m => String(m.id) === String(local.id))) {
              merged.push(local);
            }
          });
          setWatchlist(merged);
        } else {
          // No backend data, use localStorage directly
          setWatchlist(localWatchlist);
        }
        if (u.ratings) setRated(u.ratings);
        if (u.favorites) setFavorites(u.favorites);
        if (u.socialLinks) setSocialLinks(u.socialLinks || {});
        if (u.memberSince || u.createdAt) {
          const d = new Date(u.memberSince || u.createdAt);
          if (!isNaN(d.getTime())) {
            const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
            setJoinDate(`${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`);
          }
        }
      } else {
        // Not logged in — fallback to localStorage
        setWatchlist(loadWatchlist());
      }
    } catch { setWatchlist(loadWatchlist()); }
    setLoading(false);
  }, [isRemoteProfile]);


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
            const uid = u.id || u._id;
            setRemoteUserId(uid);
            setPolledRemoteUserId(uid);
            if (u.watchlist) {
              setWatchlist(u.watchlist.map(item => ({
                id: item.animeId, name: item.name, img: item.img,
                rating: item.rating, episodes: item.episodes,
                year: item.year, status: item.status, genres: item.genres || [],
                listStatus: item.listStatus || "Planning", type: "anime",
              })));
            }
            if (u.ratings) setRated(u.ratings);
            if (u.favorites) setFavorites(u.favorites);
            if (u.socialLinks) setSocialLinks(u.socialLinks || {});
            if (u.createdAt) {
              const d = new Date(u.createdAt);
              const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
              setJoinDate(`${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`);
            }
          }
        } catch (e) { console.error('[Otaku] Profile load failed:', e); }
        setLoading(false);
      })();
    } else {
      loadProfileData();
      setRecentHistory(loadWatchHistory().slice(0, 5));
      window.addEventListener("watchlist-updated", loadProfileData);
      window.addEventListener("profile-data-changed", loadProfileData);
      window.addEventListener("profile-avatar-updated", loadProfileData);
      window.addEventListener("history-updated", () => setRecentHistory(loadWatchHistory().slice(0, 5)));
      return () => {
        window.removeEventListener("watchlist-updated", loadProfileData);
        window.removeEventListener("profile-data-changed", loadProfileData);
        window.removeEventListener("profile-avatar-updated", loadProfileData);
        window.removeEventListener("history-updated", () => setRecentHistory(loadWatchHistory().slice(0, 5)));
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUsername]);

  useEffect(() => {
    if (!isRemoteProfile || !remoteUserId) return;
    return () => { setPolledRemoteUserId(null); };
  }, [remoteUserId, isRemoteProfile]);

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

  const handleToggleFavorite = async (anime, e) => {
    e?.stopPropagation();
    const exists = favorites.find(f => f.animeId === anime.animeId);
    let updated;
    if (exists) {
      updated = favorites.filter(f => f.animeId !== anime.animeId);
    } else {
      if (favorites.length >= MAX_FAVORITES) return;
      updated = [...favorites, { animeId: anime.animeId, name: anime.name, img: anime.img }];
    }
    setFavorites(updated);
    await authService.updateFavorites(updated).catch(err => console.error('[Otaku] Failed to update favorites:', err));
  };

  const counts = useMemo(() => ({
    all: watchlist.length,
    Watching: watchlist.filter(w => w.listStatus === "Watching").length,
    Planning: watchlist.filter(w => w.listStatus === "Planning").length,
    Completed: watchlist.filter(w => w.listStatus === "Completed").length,
    Paused: watchlist.filter(w => w.listStatus === "Paused").length,
    Dropped: watchlist.filter(w => w.listStatus === "Dropped").length,
  }), [watchlist]);

  const isUserSearch = searchQuery.startsWith("@");

  const filteredAnime = useMemo(() => {
    if (isUserSearch) return [];
    let list = activeTab === "all" ? watchlist : watchlist.filter(w => w.listStatus === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(w => w.name?.toLowerCase().includes(q));
    }
    return list;
  }, [watchlist, activeTab, searchQuery, isUserSearch]);

  useEffect(() => {
    if (!isUserSearch) { setUserResults([]); return; }
    const q = searchQuery.slice(1).trim();
    if (!q) { setUserResults([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const users = await authService.searchUsers(q);
        if (!cancelled) setUserResults(users || []);
      } catch {
        if (!cancelled) setUserResults([]);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery, isUserSearch]);

  const userAvatar = avatarPreview || avatar;
  const userInitial = username.charAt(0).toUpperCase();

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

                {/* Social Links */}
                {Object.entries(socialLinks).filter(([, v]) => v).length > 0 && (
                  <div className="upp-social-row">
                    {Object.entries(SOCIAL_ICONS).map(([key, Icon]) => {
                      const url = socialLinks[key];
                      if (!url) return null;
                      let href = key === "discord" ? null : url;
                      if (key === "myanimelist" && !url.startsWith("http")) href = `https://myanimelist.net/profile/${url}`;
                      if (key === "anilist" && !url.startsWith("http")) href = `https://anilist.co/user/${url}`;
                      if (key === "twitter" && !url.startsWith("http")) href = `https://twitter.com/${url}`;
                      if (key === "instagram" && !url.startsWith("http")) href = `https://instagram.com/${url}`;
                      return href ? (
                        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="upp-social-link" title={key}>
                          <Icon size={16} />
                        </a>
                      ) : (
                        <span key={key} className="upp-social-link" title={key} style={{ opacity: 0.5, cursor: "default" }}>
                          <Icon size={16} />
                        </span>
                      );
                    })}
                  </div>
                )}

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

            {/* Stats row */}
            <div className="upp-actions">
              <button className="upp-action-btn" onClick={() => { if (navigator.share) navigator.share({ title: username, url: window.location.href }); else navigator.clipboard?.writeText(window.location.href); }}>
                <Share2 size={14} /> Share
              </button>
              {isOwnProfile && (
                <button className="upp-action-btn" onClick={() => navigate("/settings")}>
                  <Settings size={14} /> Settings
                </button>
              )}
              {isOwnProfile && (
                <button className="upp-action-btn upp-action-btn--danger" onClick={async () => { await authService.logout(); navigate("/home"); }}>
                  <LogOut size={14} /> Logout
                </button>
              )}
            </div>
          </div>

          {/* ── FAVORITES ── */}
          {favorites.length > 0 && (
            <div className="upp-section">
              <div className="upp-section-inner">
                <h2 className="upp-section-title">
                  <Heart size={16} /> Favorites
                </h2>
                <div className="upp-fav-row">
                  {favorites.map((f, i) => (
                    <motion.button
                      key={f.animeId || i}
                      className="upp-fav-card"
                      onClick={() => navigate(`/anime/${f.animeId}/info`)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="upp-fav-img-wrap">
                        <img src={f.img} alt={f.name} loading="lazy" />
                      </div>
                      <span className="upp-fav-name">{f.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── RECENT ACTIVITY ── */}
          {recentHistory.length > 0 && (
            <div className="upp-section">
              <div className="upp-section-inner">
                <h2 className="upp-section-title">
                  <Film size={16} /> Recently Watched
                </h2>
                <div className="upp-history-row">
                  {recentHistory.map((item, i) => (
                    <motion.button
                      key={`${item.animeId}-${item.episode}-${i}`}
                      className="upp-history-item"
                      onClick={() => navigate(`/anime/${item.animeId}?ep=${item.episode}`)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="upp-history-img">
                        <img src={item.animeImg} alt={item.animeName} loading="lazy" />
                      </div>
                      <div className="upp-history-info">
                        <span className="upp-history-name">{item.animeName}</span>
                        <span className="upp-history-ep">Episode {item.episode}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── WATCHLIST ── */}
          <div className="upp-watchlist-section">
            <div className="upp-watchlist-inner">
              <div className="upp-watchlist-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <h2 className="upp-watchlist-title" style={{ margin: 0 }}>Watchlist</h2>
                  {isOwnProfile && (
                    <button className="upp-action-btn" onClick={() => navigate("/watchlist")}>
                      <Eye size={14} /> Full Library View
                    </button>
                  )}
                </div>
                <div className="upp-watchlist-header-right">
                  <span className="upp-watchlist-count">{filteredAnime.length} anime</span>
                    <div className="upp-search-box">
                      <Search size={14} />
                      <input
                        className="upp-search-input"
                        placeholder={isUserSearch ? "Search users..." : "Search anime or @user..."}
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

              {isUserSearch ? (
                userResults.length > 0 ? (
                  <div className="upp-list">
                    {userResults.map((u, i) => (
                      <button
                        key={u.id || u._id || i}
                        className="upp-list-row"
                        onClick={() => navigate(`/profile/${u.username}`)}
                      >
                        <div className="upp-list-img">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.username} style={{ borderRadius: "50%" }} />
                          ) : (
                            <div className="upp-list-img-placeholder" style={{ borderRadius: "50%", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: 18 }}>
                              {u.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="upp-list-info">
                          <h4 className="upp-list-title">{u.username}</h4>
                          <span className="upp-list-meta">@{u.username}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="upp-empty">
                    <div className="upp-empty-icon-bg">
                      <Search size={60} />
                    </div>
                    <h3 className="upp-empty-title">No Users Found</h3>
                    <p className="upp-empty-msg">
                      {searchQuery.length > 1 ? `No users matching "${searchQuery.slice(1)}".` : "Type a username to search."}
                    </p>
                  </div>
                )
              ) : loading ? (
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
                        <motion.div
                          key={item.id}
                          className="upp-list-row"
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.02, duration: 0.2 }}
                          onClick={() => navigate(`/anime/${item.id}/info`)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && navigate(`/anime/${item.id}/info`)}
                        >
                          <div className="upp-list-img">
                            <img src={item.img} alt={item.name} loading="lazy" decoding="async" />
                          </div>
                          <div className="upp-list-info">
                            <h4 className="upp-list-title">{item.name}</h4>
                            <span className="upp-list-meta">
                              {item.status || "TV"}{item.episodes ? ` · ${item.episodes} ep` : ""}
                            </span>
                          </div>
                          <span className={`upp-list-status upp-list-status--${item.listStatus?.toLowerCase()}`}>
                            {item.listStatus}
                          </span>
                          <div className="upp-list-rating">
                            {userRating ? (
                              <><Star size={12} fill="#ffffff" color="#ffffff" /> {userRating}</>
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
                                className={`upp-list-action ${favorites.find(f => f.animeId === item.id) ? "upp-list-action--fav" : ""}`}
                                onClick={(e) => handleToggleFavorite({ animeId: item.id, name: item.name, img: item.img }, e)}
                                aria-label="Toggle favorite"
                                title={favorites.find(f => f.animeId === item.id) ? "Remove from favorites" : "Add to favorites"}
                              >
                                <Heart size={14} fill={favorites.find(f => f.animeId === item.id) ? "#ffffff" : "none"} color={favorites.find(f => f.animeId === item.id) ? "#ffffff" : "rgba(255,255,255,0.3)"} />
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
                        </motion.div>
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
    </>
  );
}


