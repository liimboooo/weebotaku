import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import authService from "../services/authService";
import settingsService from "../services/settingsService";
import AnimatedPage from "../components/AnimatedPage";
import SyncCard from "../components/SyncCard";
import FavoritesSyncCard from "../components/FavoritesSyncCard";
import { TOAST_DURATION_MS } from "../utils/constants";
import {
  User, Settings, Bell, Shield, Link2,
  Eye, EyeOff, LogOut,
  CheckCircle, X, Trash2,
  AlertTriangle,
  ChevronLeft, ArrowRight,
} from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./SettingsPage.css";

const SECTIONS = [
  {
    title: "Account & Security",
    subtitle: null,
    cols: 3,
    cards: [
      { key: "account",       icon: User,     label: "Account",           desc: "Manage profile, email, username",               color: "#ffffff" },
      { key: "privacy",       icon: Shield,   label: "Privacy & Security",desc: "2FA, password, privacy",                   color: "#ffffff" },
      { key: "notifications", icon: Bell,     label: "Notifications",     desc: "New episodes, replies, recs",                 color: "#ffffff" },
    ],
  },
  {
    title: "Customization",
    subtitle: null,
    cols: 1,
    cards: [
      { key: "preferences",   icon: Settings, label: "Preferences",       desc: "Playback, subtitles",                 color: "#ffffff" },
    ],
  },
  {
    title: "Integrations",
    subtitle: "Connect your favorite services",
    cols: 1,
    cards: [
      { key: "sync",          icon: Link2,    label: "Sync & Connected Apps", desc: "MAL, AniList",                        color: "#4ade80" },
    ],
  },
];

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const cardItem = { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } } };

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function SettingsPage() {
  useDocumentTitle("Settings");
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const [page, setPage] = useState("home");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [loading, setLoading] = useState(true);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem("otaku_settings");
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });
  const [settingsReady, setSettingsReady] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await settingsService.load();
      setSettings(s);
      setSettingsReady(true);
      setLoading(false);
    })();
  }, []);

  const [syncStatus, setSyncStatus] = useState({ mal: { connected: false }, anilist: { connected: false } });
  const [syncLoading, setSyncLoading] = useState({ mal: false, anilist: false });
  const [favorites, setFavorites] = useState([]);

  const [profile, setProfile] = useState(() => {
    const p = settingsService.loadUserProfile() || {
      username: currentUser?.username || "",
      email: currentUser?.email || "",
      avatar: currentUser?.avatar || "",
      emailVerified: currentUser?.emailVerified || false,
    };
    return p;
  });
  const initialProfileRef = useRef(null);
  if (!initialProfileRef.current) initialProfileRef.current = { ...profile };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState({ current: false, newPass: false, confirm: false });
  const [pwFields, setPwFields] = useState({ current: "", newPass: "", confirm: "" });
  const [pwStrength, setPwStrength] = useState({ label: "", color: "", width: "0%" });
  const [pwErrors, setPwErrors] = useState([]);
  const [pwChanging, setPwChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isFirstRender = useRef(true);

  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => {
    if (!settingsReady) return;
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    settingsService.save(settings);
  }, [settings, settingsReady]);

  useEffect(() => {
    if (!settingsReady) return;
    authService.getSyncStatus().then(res => {
      if (res?.success) {
        setSyncStatus({ mal: res.mal, anilist: res.anilist });
      }
    }).catch(err => console.error('[Otaku] Failed to load sync status:', err));
    
    authService.getMe().then(res => {
      if (res?.success && res?.user?.favorites) {
        setFavorites(res.user.favorites);
      }
    }).catch(err => console.error('[Otaku] Failed to load user data:', err));
  }, [settingsReady]);

  useEffect(() => {
    if (!settingsReady) return;
    const malConnected = syncStatus.mal?.connected;
    const anilistConnected = syncStatus.anilist?.connected;
    if (!malConnected && !anilistConnected) return;

    const interval = setInterval(async () => {
      if (malConnected) {
        try { await authService.manualSyncMAL(); } catch {}
      }
      if (anilistConnected) {
        try { await authService.manualSyncAniList(); } catch {}
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [settingsReady, syncStatus.mal?.connected, syncStatus.anilist?.connected]);

  const initial = (profile.username || "U").charAt(0).toUpperCase();
  const joinDate = currentUser?.memberSince
    ? new Date(currentUser.memberSince).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "May 24, 2026";

  const toggle = async (id) => {
    setSettings(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const setTog = (id, val) => setSettings(prev => ({ ...prev, [id]: val }));

  const updateProfile = (key, val) => {
    setProfile(prev => {
      const next = { ...prev, [key]: val };
      settingsService.saveUserProfile(next);
      return next;
    });
  };

  const togglePw = (f) => setShowPassword(prev => ({ ...prev, [f]: !prev[f] }));

  const handleLogout = async () => {
    await authService.logout();
    navigate("/home");
  };

  const handleSyncMAL = async () => {
    setSyncLoading(prev => ({ ...prev, mal: true }));
    try {
      const result = await authService.manualSyncMAL();
      if (result?.success) {
        const s = await authService.getSyncStatus();
        if (s?.success) setSyncStatus({ mal: s.mal, anilist: s.anilist });
        showToast(`MAL: ${result.imported || 0} imported, ${result.total || 0} total`);
      } else {
        showToast(result?.message || "Sync failed", "error");
      }
    } catch {
      showToast("Sync failed. Try again.", "error");
    }
    setSyncLoading(prev => ({ ...prev, mal: false }));
  };

  const handleConnectMAL = async () => {
    try {
      const res = await authService.connectMAL();
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      } else {
        showToast("Failed to get MAL auth URL", "error");
      }
    } catch {
      showToast("Failed to connect MAL", "error");
    }
  };

  const handleConnectAniList = async () => {
    try {
      const res = await authService.connectAniList();
      if (res?.authUrl) {
        window.location.href = res.authUrl;
      } else {
        showToast("Failed to get AniList auth URL", "error");
      }
    } catch {
      showToast("Failed to connect AniList", "error");
    }
  };

  const handleDisconnectMAL = async () => {
    setSyncLoading(prev => ({ ...prev, mal: true }));
    try {
      await authService.disconnectMAL();
      setSyncStatus(prev => ({ ...prev, mal: { connected: false } }));
      showToast("MAL disconnected.", "info");
    } catch {
      showToast("Failed to disconnect", "error");
    }
    setSyncLoading(prev => ({ ...prev, mal: false }));
  };

  const handleSyncAniList = async () => {
    setSyncLoading(prev => ({ ...prev, anilist: true }));
    try {
      const result = await authService.manualSyncAniList();
      if (result?.success) {
        const s = await authService.getSyncStatus();
        if (s?.success) setSyncStatus({ mal: s.mal, anilist: s.anilist });
        showToast(`AniList: ${result.imported || 0} imported, ${result.total || 0} total`);
      } else {
        showToast(result?.message || "Sync failed", "error");
      }
    } catch {
      showToast("Sync failed. Try again.", "error");
    }
    setSyncLoading(prev => ({ ...prev, anilist: false }));
  };

  const handleDisconnectAniList = async () => {
    setSyncLoading(prev => ({ ...prev, anilist: true }));
    try {
      await authService.disconnectAniList();
      setSyncStatus(prev => ({ ...prev, anilist: { connected: false } }));
      showToast("AniList disconnected.", "info");
    } catch {
      showToast("Failed to disconnect", "error");
    }
    setSyncLoading(prev => ({ ...prev, anilist: false }));
  };

  const handlePwChange = (field, val) => {
    setPwFields(prev => ({ ...prev, [field]: val }));
    if (field === "newPass") {
      setPwStrength(settingsService.getPasswordStrength(val));
    }
  };

  const handleChangePassword = async () => {
    setPwErrors([]);
    if (pwFields.newPass !== pwFields.confirm) {
      setPwErrors(["Passwords do not match"]);
      return;
    }
    setPwChanging(true);
    const result = await settingsService.changePassword(pwFields.current, pwFields.newPass);
    setPwChanging(false);
    if (result.success) {
      showToast("Password changed successfully!");
      setPwFields({ current: "", newPass: "", confirm: "" });
      setPwStrength({ label: "", color: "", width: "0%" });
    } else {
      setPwErrors(result.errors);
    }
  };


  const [deletePassword, setDeletePassword] = useState("");

  const handleDeleteAccount = async () => {
    if (!deletePassword) { showToast("Enter your password", "error"); return; }
    setDeleting(true);
    try {
      await settingsService.deleteAccount(deletePassword);
      setShowDeleteModal(false);
      showToast("Account deleted. Redirecting...", "info");
      setTimeout(() => { navigate("/"); }, 1500);
    } catch (e) {
      showToast(e?.message || "Failed to delete account", "error");
    }
    setDeleting(false);
  };

  const handleSaveProfile = async () => {
    try {
      const init = initialProfileRef.current || {};
      const changed = {};
      if (profile.username !== init.username) changed.username = profile.username;
      if (profile.avatar !== init.avatar) changed.avatar = profile.avatar || "";
      if (Object.keys(changed).length === 0) { showToast("Nothing to save"); return; }
      const data = await authService.updateProfile(changed);
      if (data?.success) {
        initialProfileRef.current = { ...profile };
        settingsService.saveUserProfile(profile);
        showToast("Profile saved!");
      } else {
        showToast(data?.message || "Failed to save profile", "error");
      }
    } catch (e) {
      showToast(e?.message || "Failed to save profile.", "error");
    }
  };


  const handleSavePreferences = async () => {
    await settingsService.save(settings);
    showToast("Preferences saved!");
  };

  const back = () => setPage("home");

  const countConnected = () => {
    let c = 0;
    if (settings.malConnected) c++;
    if (settings.aniConnected) c++;
    return c;
  };

  const renderDashboard = () => (
    <motion.div className="st-dashboard" variants={stagger} initial="initial" animate="animate">
      <motion.h1 className="st-page-title" variants={cardItem}>Settings</motion.h1>
      <motion.p className="st-page-sub" variants={cardItem}>Manage your account, preferences, and connected services.</motion.p>

      {SECTIONS.map(section => (
        <div key={section.title} className="st-section-group">
          <div className="st-section-header">
            <div className="st-section-header-text">
              <h2 className="st-section-heading">{section.title}</h2>
              {section.subtitle && <span className="st-section-sub">{section.subtitle}</span>}
            </div>
            <div className="st-section-divider" />
          </div>
          <div className={`st-card-grid st-card-grid--${section.cols}`}>
            {section.cards.map(({ key, icon: Icon, label, desc, color }) => (
              <motion.button
                key={key}
                className={`st-dash-card ${key === "sync" ? "st-dash-card--highlight" : ""}`}
                variants={cardItem}
                whileHover={{ scale: 1.04, y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setPage(key)}
              >
                <div className="st-dash-card-icon" style={{ background: `${color}18`, color }}>
                  <Icon size={32} />
                </div>
                <div className="st-dash-card-body">
                  <span className="st-dash-card-title">{label}</span>
                  <span className="st-dash-card-desc">{desc}</span>
                  {key === "sync" && countConnected() > 0 && (
                    <span className="st-dash-card-status">
                      <CheckCircle size={12} /> {countConnected()} Connected
                    </span>
                  )}
                </div>
                <ArrowRight size={16} className="st-dash-card-arrow" style={{ color }} />
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );

  const renderBack = () => (
    <motion.button className="st-back-btn" onClick={back} whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
      <ChevronLeft size={20} /> Back to Settings
    </motion.button>
  );

  const renderToggle = (id, label, desc) => (
    <div className="st-toggle-row">
      <div className="st-toggle-info">
        <span className="st-toggle-label">{label}</span>
        {desc && <span className="st-toggle-desc">{desc}</span>}
      </div>
      <button className={`st-toggle ${settings[id] ? "active" : ""}`} onClick={() => toggle(id)}>
        <span className="st-toggle-knob" />
      </button>
    </div>
  );

  const renderSectionHeader = (title, subtitle) => (
    <div className="st-detail-section-header">
      <h3 className="st-detail-section-title">{title}</h3>
      {subtitle && <span className="st-detail-section-sub">{subtitle}</span>}
      <div className="st-detail-section-divider" />
    </div>
  );

  const renderField = (label, hint, children) => (
    <div className="st-field">
      <label className="st-field-label">{label}</label>
      {hint && <span className="st-field-hint">{hint}</span>}
      {children}
    </div>
  );

  const renderAccount = () => (
    <motion.div key="account" className="st-page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <h1 className="st-page-title">Account</h1>
      <p className="st-detail-section-sub" style={{ marginTop: "-0.5rem", marginBottom: "2rem" }}>Manage your profile information</p>

      {renderSectionHeader("Profile Information")}

      <div className="st-profile-card">
        <div className="st-profile-left">
          <div className="st-avatar-lg">
            {profile.avatar ? <img src={profile.avatar} alt={profile.username} /> : <span>{initial}</span>}
          </div>
          <div className="st-profile-info">
            <span className="st-profile-name">{profile.username}</span>
            <span className="st-profile-joined">{joinDate !== "Jan 1, 1970" ? "Joined " + joinDate : ""}</span>
          </div>
        </div>
        <button className="st-btn st-btn--danger" onClick={handleLogout}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="st-form">
        {renderField("Username", "3-10 characters, letters and numbers only.", (
          <input className="st-input" value={profile.username} onChange={e => updateProfile("username", e.target.value)} placeholder="Enter username" />
        ))}
          {renderField("Avatar", "Click to upload from your device", (
          <div className="st-avatar-upload-row">
            <input
              type="file"
              accept="image/*"
              id="avatar-upload"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { showToast("Image must be under 2MB", "error"); return; }
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const img = new Image();
                  img.onload = () => {
                    let w = img.width, h = img.height;
                    const max = 200;
                    if (w > max || h > max) {
                      const ratio = Math.min(max / w, max / h);
                      w = Math.round(w * ratio);
                      h = Math.round(h * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    setProfile(p => ({ ...p, avatar: dataUrl }));
                  };
                  img.src = ev.target?.result;
                };
                reader.readAsDataURL(file);
              }}
            />
            <label htmlFor="avatar-upload" className="st-avatar-upload-label">
              {profile.avatar ? (
                <img src={profile.avatar} alt="avatar" className="st-avatar-preview" />
              ) : (
                <span className="st-avatar-placeholder">{initial}</span>
              )}
              <span className="st-avatar-upload-text">Change</span>
            </label>
          </div>
        ))}
        {renderField("Email", "Your primary email address.", (
          <div className="st-verify-status" style={{ padding: "0.5rem 0" }}>
            <span className="st-profile-name" style={{ fontSize: "14px" }}>{profile.email}</span>
            <span className={`st-badge ${profile.emailVerified ? "st-badge--green" : "st-badge--red"}`} style={{ marginLeft: "0.75rem" }}>
              {profile.emailVerified ? "Verified" : "Unverified"}
            </span>
          </div>
        ))}
      </div>

      <button className="st-btn st-btn--green st-btn--full" onClick={handleSaveProfile} style={{ marginTop: "0.5rem" }}>
        Save Profile
      </button>

      <div className="st-divider" />

      {renderSectionHeader("Danger Zone", "Irreversible actions")}

      <div className="st-danger-card">
        <div className="st-danger-inner">
          <p className="st-danger-desc" style={{ marginTop: 0 }}>Delete your account permanently. This action cannot be undone.</p>
          <button className="st-btn st-btn--danger-outline" onClick={() => setShowDeleteModal(true)}>
            <Trash2 size={16} /> Delete Account
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderPreferences = () => (
    <motion.div key="preferences" className="st-page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <h1 className="st-page-title">Preferences</h1>

      {renderSectionHeader("Video Player")}
      {renderToggle("autoNext", "Auto play next episode", "Automatically play next episode when current finishes")}
      {renderToggle("skipIntro", "Skip intro automatically", "Automatically skip opening sequences")}
      {renderToggle("skipOutro", "Skip outro automatically", "Automatically skip ending sequences")}

      <div className="st-field" style={{ marginTop: "1rem" }}>
        <label className="st-field-label">Default Audio</label>
        <div className="st-radio-group">
          {["subbed", "dubbed", "nopreference"].map(opt => (
            <button key={opt} className={`st-radio ${settings.defaultDubbed === opt ? "active" : ""}`}
              onClick={() => setTog("defaultDubbed", opt)}>
              {opt === "subbed" ? "Prefer Subbed" : opt === "dubbed" ? "Prefer Dubbed" : "No preference"}
            </button>
          ))}
        </div>
      </div>

      <div className="st-field">
        <label className="st-field-label">Playback Speed</label>
        <div className="st-radio-group">
          {SPEEDS.map(s => (
            <button key={s} className={`st-radio st-radio--lg ${settings.playbackSpeed === s ? "active" : ""}`}
              onClick={() => setTog("playbackSpeed", s)}>
              {s}x
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const renderNotifications = () => (
    <motion.div key="notifications" className="st-page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <h1 className="st-page-title">Notifications</h1>

      {renderSectionHeader("Email Notifications")}
      {renderToggle("emailNotifs", "Enable email notifications", "Receive notifications via email")}
      {settings.emailNotifs && (
        <div className="st-sub-toggles">
          {renderToggle("newEpisodes", "New episode alerts", "Get notified when new episodes air")}
          {renderToggle("communityActivity", "Community activity", "Replies, mentions, and reactions")}
          {renderToggle("systemUpdates", "System updates", "Platform changes and new features")}
          {renderToggle("weeklyRecs", "Weekly recommendations", "Personalized anime suggestions")}
        </div>
      )}

      {renderToggle("animeRecs", "Anime recommendations", "Personalized anime suggestions")}
      {renderToggle("newFeatures", "New features announcement", "Updates about new platform features")}
    </motion.div>
  );

  const renderPrivacy = () => (
    <motion.div key="privacy" className="st-page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <h1 className="st-page-title">Privacy & Security</h1>

      {renderSectionHeader("Password")}
      <div className="st-pw-card">
        <div className="st-form">
          {renderField("Current Password", "Enter your existing password to verify your identity.", (
            <div className="st-pw-wrap">
              <input className="st-input" type={showPassword.current ? "text" : "password"} placeholder="Current password" value={pwFields.current} onChange={e => handlePwChange("current", e.target.value)} />
              <button className="st-pw-toggle" onClick={() => togglePw("current")}>
                {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          ))}
          {renderField("New Password", "Min 8 characters, 1 uppercase, 1 number.", (
            <div className="st-pw-wrap">
              <input className="st-input" type={showPassword.newPass ? "text" : "password"} placeholder="New password" value={pwFields.newPass} onChange={e => handlePwChange("newPass", e.target.value)} />
              <button className="st-pw-toggle" onClick={() => togglePw("newPass")}>
                {showPassword.newPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          ))}
          {pwFields.newPass && (
            <>
              <div className="st-strength-bar">
                <div className="st-strength-fill" style={{ width: pwStrength.width, background: pwStrength.color }} />
              </div>
              <span className="st-strength-label" style={{ color: pwStrength.color }}>{pwStrength.label}</span>
            </>
          )}
          {renderField("Confirm New Password", null, (
            <div className="st-pw-wrap">
              <input className="st-input" type={showPassword.confirm ? "text" : "password"} placeholder="Confirm new password" value={pwFields.confirm} onChange={e => handlePwChange("confirm", e.target.value)} />
              <button className="st-pw-toggle" onClick={() => togglePw("confirm")}>
                {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          ))}
          {pwErrors.length > 0 && (
            <div className="st-pw-errors">
              {pwErrors.map((e, i) => <span key={i} className="st-pw-error">{e}</span>)}
            </div>
          )}
          <button className="st-btn st-btn--green st-btn--full" onClick={handleChangePassword} disabled={pwChanging || !pwFields.current || !pwFields.newPass || !pwFields.confirm}>
            {pwChanging ? "Changing..." : "Change Password"}
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderSync = () => (
    <motion.div key="sync" className="st-page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <h1 className="st-page-title">Sync & Connected Apps</h1>

      <div className="st-divider" />
      {renderSectionHeader("Connected Services")}
      <SyncCard
        service="mal"
        status={syncStatus.mal}
        username={syncStatus.mal?.username}
        lastSynced={syncStatus.mal?.lastSynced}
        loading={syncLoading.mal}
        onConnect={handleConnectMAL}
        onDisconnect={handleDisconnectMAL}
        onSync={handleSyncMAL}
      />
      <div style={{ height: 12 }} />
      <SyncCard
        service="anilist"
        status={syncStatus.anilist}
        username={syncStatus.anilist?.username}
        lastSynced={syncStatus.anilist?.lastSynced}
        loading={syncLoading.anilist}
        onConnect={handleConnectAniList}
        onDisconnect={handleDisconnectAniList}
        onSync={handleSyncAniList}
      />

      <div className="st-divider" />
      {renderSectionHeader("Sync Information")}
      <div className="st-info-card">
        <p><strong>Manual sync</strong> uses OAuth to fetch your latest list</p>
        <p><strong>MAL</strong> uses MyAnimeList OAuth v1 + official API</p>
        <p><strong>AniList</strong> uses AniList OAuth v2 + GraphQL API</p>
        <p className="st-info-ok"><CheckCircle size={14} /> Data synced with your authorization</p>
      </div>

      <div className="st-divider" />
      {renderSectionHeader("Favorites Backup")}
      <FavoritesSyncCard
        favorites={favorites}
        onUpdateFavorites={setFavorites}
      />

      <div className="st-divider" />
      {renderSectionHeader("Need Credentials?")}
      <div className="st-info-card">
        <p>To enable OAuth sync, the server needs MAL and AniList app credentials configured in <code>.env</code>.</p>
        <p style={{ marginTop: 8 }}>Contact the admin if sync isn't working.</p>
      </div>
    </motion.div>
  );

  return (
    <AnimatedPage>
      <div className="st">
        {loading && (
          <div className="st">
            <div className="st-dashboard">
              <div className="h-8 w-28 bg-[#14151a] animate-pulse rounded-lg mb-2" />
              <div className="h-4 w-72 bg-[#14151a] animate-pulse rounded mb-8" />
              {SECTIONS.map(section => (
                <div key={section.title} className="st-section-group">
                  <div className="st-section-header">
                    <div className="st-section-header-text">
                      <div className="h-5 w-40 bg-[#14151a] animate-pulse rounded" />
                      {section.subtitle && <div className="h-3 w-56 bg-[#14151a] animate-pulse rounded mt-1.5" />}
                    </div>
                    <div className="st-section-divider" />
                  </div>
                  <div className={`st-card-grid st-card-grid--${section.cols}`}>
                    {section.cards.map(({ key }) => (
                      <div key={key} className="st-dash-card" style={{ pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div className="st-dash-card-icon" style={{ background: 'rgba(255,255,255,0.03)', color: 'transparent' }}>
                          <div className="w-8 h-8 bg-[#14151a] animate-pulse rounded-lg" />
                        </div>
                        <div className="st-dash-card-body">
                          <div className="h-4 w-28 bg-[#14151a] animate-pulse rounded mb-1" />
                          <div className="h-3 w-44 bg-[#14151a] animate-pulse rounded" />
                        </div>
                        <div className="h-4 w-4 bg-[#14151a] animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && (
          <>
        {showDeleteModal && createPortal(
          <div className="st-modal-overlay" onClick={() => setShowDeleteModal(false)} onKeyDown={(e) => { if (e.key === 'Escape') setShowDeleteModal(false); }} tabIndex={-1} ref={(el) => el?.focus()}>
            <div className="st-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
              <div className="st-modal-head">
                <h3>Delete Account</h3>
                <button className="st-modal-close" onClick={() => setShowDeleteModal(false)}><X size={18} /></button>
              </div>
              <div className="st-modal-body">
                <div className="st-modal-icon"><AlertTriangle size={40} /></div>
                <p className="st-modal-desc">This action is permanent and cannot be undone. All your data will be deleted.</p>
                <input type="password" className="st-input" style={{ marginTop: "1rem", width: "100%" }} value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="Enter your password to confirm" />
              </div>
              <div className="st-modal-foot">
                <button className="st-btn st-btn--dark" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="st-btn st-btn--danger" disabled={!deletePassword || deleting} onClick={handleDeleteAccount}>
                  {deleting ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {toast && (
          <div className={`st-toast st-toast--${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        )}

        <div className="st-body">
          {page === "home" ? (
            renderDashboard()
          ) : (
            <div className="st-detail">
              {renderBack()}
              <AnimatePresence mode="wait">
                {page === "account" && renderAccount()}
                {page === "preferences" && renderPreferences()}
                {page === "notifications" && renderNotifications()}
                {page === "privacy" && renderPrivacy()}
                {page === "sync" && renderSync()}
              </AnimatePresence>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </AnimatedPage>
  );
}
