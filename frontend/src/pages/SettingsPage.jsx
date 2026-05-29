import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import authService from "../services/authService";
import settingsService from "../services/settingsService";
import { clearNotifications } from "../services/notificationService";
import AnimatedPage from "../components/AnimatedPage";
import SyncCard from "../components/SyncCard";
import {
  User, Settings, Bell, Shield, Link2,
  Eye, EyeOff, LogOut, Sun, Moon, Monitor,
  CheckCircle, X, Trash2,
  AlertTriangle,
  ChevronLeft, RefreshCw, ArrowRight, Mail,
} from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";
import "./SettingsPage.css";

const SECTIONS = [
  {
    title: "Account & Security",
    subtitle: null,
    cols: 3,
    cards: [
      { key: "account",       icon: User,     label: "Account",           desc: "Manage profile, email, bio",               color: "#667eea" },
      { key: "privacy",       icon: Shield,   label: "Privacy & Security",desc: "2FA, password, privacy",                   color: "#ff6b6b" },
      { key: "notifications", icon: Bell,     label: "Notifications",     desc: "Email, push, alerts",                      color: "#fbbf24" },
    ],
  },
  {
    title: "Customization",
    subtitle: null,
    cols: 1,
    cards: [
      { key: "preferences",   icon: Settings, label: "Preferences",       desc: "Theme, display, playback",                 color: "#00d4ff" },
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

const FONT_SIZES = ["Small", "Medium", "Large", "Extra Large"];
const THEME_ACCENTS = [
  { label: "Purple", value: "#667eea" },
  { label: "Cyan", value: "#00d4ff" },
  { label: "Green", value: "#4ade80" },
  { label: "Pink", value: "#f472b6" },
];
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const CONTENT_RATINGS = ["G", "PG", "PG-13", "R", "R+ (17+)", "Rx (18+)"];
const LIST_VIEWS = ["Grid", "List", "Compact"];

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
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem("animewch_settings");
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  });
  const [settingsReady, setSettingsReady] = useState(false);
  const syncInit = useRef(settingsService.loadSync());

  useEffect(() => {
    (async () => {
      const s = await settingsService.load();
      setSettings(s);
      setSettingsReady(true);
      setLoading(false);
    })();
  }, []);

  const [syncStates, setSyncStates] = useState({
    malSyncing: false, aniSyncing: false,
    malLastSync: syncInit.current.malLastSync,
    aniLastSync: syncInit.current.aniLastSync,
  });
  const [syncStatus, setSyncStatus] = useState({ mal: { connected: false }, anilist: { connected: false } });
  const [syncLoading, setSyncLoading] = useState({ mal: false, anilist: false });

  const [profile, setProfile] = useState(() => settingsService.loadUserProfile() || {
    username: currentUser?.username || "formula09",
    displayName: currentUser?.username || "formula09",
    email: currentUser?.email || "user@example.com",
    bio: currentUser?.bio || "",
    website: "",
    emailVerified: true,
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState({ current: false, newPass: false, confirm: false });
  const [pwFields, setPwFields] = useState({ current: "", newPass: "", confirm: "" });
  const [pwStrength, setPwStrength] = useState({ label: "", color: "", width: "0%" });
  const [pwErrors, setPwErrors] = useState([]);
  const [pwChanging, setPwChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFASecret, setTwoFASecret] = useState("");
  const [twoFAQr, setTwoFAQr] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAStep, setTwoFAStep] = useState("idle");
  const [twoFABackupCodes, setTwoFABackupCodes] = useState([]);
  const [twoFADisablePw, setTwoFADisablePw] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);

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
    settingsService.get2FAStatus().then(status => {
      if (status?.enabled) setTwoFAEnabled(true);
    }).catch(() => {});
  }, [settingsReady]);

  useEffect(() => {
    if (!settingsReady) return;
    authService.getSyncStatus().then(res => {
      if (res?.success) {
        setSyncStatus({ mal: res.mal, anilist: res.anilist });
      }
    }).catch(() => {});
  }, [settingsReady]);

  const avatar = currentUser?.avatar || "";
  const initial = (profile.username || "U").charAt(0).toUpperCase();
  const joinDate = currentUser?.memberSince
    ? new Date(currentUser.memberSince).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "May 24, 2026";

  const toggle = async (id) => {
    setSettings(prev => ({ ...prev, [id]: !prev[id] }));
    if (id === "newsNotifications" && settings.newsNotifications === true) {
      await clearNotifications();
    }
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
      if (!res?.authUrl) {
        showToast("Failed to get MAL auth URL", "error");
      }
    } catch {
      showToast("Failed to connect MAL", "error");
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

  const handleConnectAniList = async () => {
    try {
      const res = await authService.connectAniList();
      if (!res?.authUrl) {
        showToast("Failed to get AniList auth URL", "error");
      }
    } catch {
      showToast("Failed to connect AniList", "error");
    }
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


  const handleDeleteAccount = async () => {
    setDeleting(true);
    await settingsService.deleteAccount();
    setDeleting(false);
    setShowDeleteModal(false);
    showToast("Account deleted. Redirecting...", "info");
    setTimeout(() => {
      window.location.href = "/";
    }, 1500);
  };

  const handleSaveProfile = async () => {
    try {
      const data = await authService.updateProfile({
        username: profile.username,
        bio: profile.bio,
      });
      if (data?.success) {
        settingsService.saveUserProfile(profile);
        showToast("Profile saved!");
      }
    } catch {
      showToast("Failed to save profile.", "error");
    }
  };

  const handleSetup2FA = async () => {
    setTwoFALoading(true);
    try {
      const data = await settingsService.setup2FA();
      if (data?.success) {
        setTwoFASecret(data.secret);
        setTwoFAQr(data.qr);
        setTwoFAStep("scan");
      }
    } catch {
      showToast("Failed to start 2FA setup.", "error");
    }
    setTwoFALoading(false);
  };

  const handleVerify2FA = async () => {
    if (twoFACode.length < 6) return;
    setTwoFALoading(true);
    try {
      const data = await settingsService.verify2FASetup(twoFACode);
      if (data?.success) {
        setTwoFAEnabled(true);
        setTwoFABackupCodes(data.backupCodes || []);
        setTwoFAStep("backup");
        showToast("2FA enabled successfully!");
      } else {
        showToast(data?.message || "Invalid code", "error");
      }
    } catch {
      showToast("Verification failed.", "error");
    }
    setTwoFALoading(false);
  };

  const handleDisable2FA = async () => {
    if (!twoFADisablePw) { showToast("Enter your password", "error"); return; }
    setTwoFALoading(true);
    try {
      const data = await settingsService.disable2FA(twoFADisablePw);
      if (data?.success) {
        setTwoFAEnabled(false);
        setTwoFAStep("idle");
        setTwoFASecret("");
        setTwoFAQr("");
        setTwoFABackupCodes([]);
        setTwoFADisablePw("");
        showToast("2FA disabled");
      } else {
        showToast(data?.message || "Failed to disable", "error");
      }
    } catch {
      showToast("Failed to disable 2FA.", "error");
    }
    setTwoFALoading(false);
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
            {avatar ? <img src={avatar} alt={profile.username} /> : <span>{initial}</span>}
          </div>
          <div className="st-profile-info">
            <span className="st-profile-name">{profile.username}</span>
            <span className="st-profile-status">Synced To Cloud</span>
            <span className="st-profile-joined">Joined {joinDate}</span>
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
        {renderField("Display Name", "How others see your name.", (
          <input className="st-input" value={profile.displayName} onChange={e => updateProfile("displayName", e.target.value)} placeholder="Enter display name" />
        ))}
        {renderField("Email Address", "Your primary email address.", (
          <>
            <div className="st-input-row">
              <input className="st-input st-input--flex" value={profile.email} onChange={e => updateProfile("email", e.target.value)} placeholder="Enter email" />
              {!profile.emailVerified && <button className="st-btn st-btn--amber">Verify Email</button>}
            </div>
            <div className="st-verify-status">
              <span className={`st-badge ${profile.emailVerified ? "st-badge--green" : "st-badge--red"}`}>
                {profile.emailVerified ? "Verified" : "Unverified"}
              </span>
              {profile.emailVerified && <span className="st-verify-date">Verified</span>}
            </div>
          </>
        ))}
      </div>

      <div className="st-divider" />

      {renderField("Bio", "Tell others a bit about you.", (
        <>
          <textarea className="st-textarea" value={profile.bio} onChange={e => updateProfile("bio", e.target.value)} placeholder="Write something about yourself..." maxLength={500} />
          <span className="st-char-count">{profile.bio.length}/500</span>
        </>
      ))}

      <div className="st-divider" />

      {renderField("Website", null, (
        <input className="st-input" value={profile.website} onChange={e => updateProfile("website", e.target.value)} placeholder="https://yoursite.com" />
      ))}

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

      {renderSectionHeader("Display")}
      <div className="st-form">
        <div className="st-field">
          <label className="st-field-label">Theme</label>
          <div className="st-theme-group">
            {[
              { id: "light", icon: Sun, label: "Light" },
              { id: "dark", icon: Moon, label: "Dark" },
              { id: "auto", icon: Monitor, label: "Auto" },
            ].map(({ id, icon: Icon, label }) => (
              <button key={id} className={`st-theme-btn ${settings.darkMode === id ? "active" : ""}`} onClick={() => setTog("darkMode", id)}>
                <Icon size={20} /> <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="st-field">
          <label className="st-field-label">Font Size</label>
          <div className="st-radio-group">
            {FONT_SIZES.map(fs => (
              <button key={fs} className={`st-radio ${settings.fontSize === fs ? "active" : ""}`} onClick={() => setTog("fontSize", fs)}>
                {fs}
              </button>
            ))}
          </div>
          <div className="st-font-preview" style={{ fontSize: settings.fontSize === "Small" ? 12 : settings.fontSize === "Large" ? 18 : settings.fontSize === "Extra Large" ? 22 : 14 }}>
            Preview text showing selected size
          </div>
        </div>
        <div className="st-field">
          <label className="st-field-label">Accent Color</label>
          <div className="st-accent-group">
            {THEME_ACCENTS.map(a => (
              <button key={a.value} className={`st-accent-btn ${settings.accentColor === a.value ? "active" : ""}`}
                onClick={() => setTog("accentColor", a.value)} style={{ background: a.value }}>
                {settings.accentColor === a.value && <CheckCircle size={14} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="st-divider" />
      {renderSectionHeader("Video Player")}
      {renderToggle("autoNext", "Auto play next episode", "Automatically play next episode when current finishes")}
      {renderToggle("skipIntro", "Skip intro automatically", "Automatically skip opening sequences")}
      {renderToggle("skipOutro", "Skip outro automatically", "Automatically skip ending sequences")}
      {renderToggle("showSubtitles", "Show subtitles by default", "Display subtitles on all content")}

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

      <div className="st-divider" />
      {renderSectionHeader("Content")}
      {renderToggle("disableAds", "Remove advertisements", "Remove ads across the platform")}
      {renderToggle("showComments", "Show comments section", "Display community comments on watch pages")}
      {renderToggle("hideNsfw", "Hide NSFW content", "Filter out adult content")}
      {renderToggle("showMatureWarnings", "Show mature content warnings", "Display warnings for mature content")}

      <div className="st-field" style={{ marginTop: "1rem" }}>
        <label className="st-field-label">Content Rating Filter</label>
        <div className="st-radio-group st-radio-group--wrap">
          {CONTENT_RATINGS.map(r => (
            <button key={r} className={`st-radio ${settings.contentRating === r ? "active" : ""}`}
              onClick={() => setTog("contentRating", r)}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="st-divider" />
      {renderSectionHeader("Anime List")}
      <div className="st-field">
        <label className="st-field-label">Default List View</label>
        <div className="st-radio-group">
          {LIST_VIEWS.map(v => (
            <button key={v} className={`st-radio ${settings.defaultListView === v ? "active" : ""}`}
              onClick={() => setTog("defaultListView", v)}>
              {v}
            </button>
          ))}
        </div>
      </div>
      {renderToggle("showEpisodeProgress", "Show episode progress", "Show watched/total episodes on cards")}
      {renderToggle("showRatingsCards", "Show ratings on cards", "Display user ratings on anime cards")}

      <button className="st-btn st-btn--green st-btn--save" onClick={handleSavePreferences}>
        <CheckCircle size={16} /> Save Preferences
      </button>
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
          {renderToggle("friendsActivity", "Friend activity", "See what your friends are watching")}
          {renderToggle("systemUpdates", "System updates", "Platform changes and new features")}
          {renderToggle("weeklyRecs", "Weekly recommendations", "Personalized anime suggestions")}
        </div>
      )}

      <div className="st-divider" />
      {renderSectionHeader("Push Notifications", "Requires browser permission.")}
      {renderToggle("pushNotifs", "Enable push notifications", "Receive browser push notifications")}
      {settings.pushNotifs && (
        <div className="st-sub-toggles">
          {renderToggle("newsNotifications", "News notifications", "Trending anime, trailers, and new episodes")}
          {renderToggle("newEpisodeAlerts", "New episodes", "Instant alerts for new episodes")}
          {renderToggle("commentReplies", "Comment replies", "When someone replies to your comment")}
          {renderToggle("friendRequests", "Friend requests", "When someone sends you a friend request")}
        </div>
      )}

      {renderToggle("animeRecs", "Anime recommendations", "Personalized anime suggestions")}
      {renderToggle("newFeatures", "New features announcement", "Updates about new platform features")}
    </motion.div>
  );

  const renderPrivacy = () => (
    <motion.div key="privacy" className="st-page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <h1 className="st-page-title">Privacy & Security</h1>

      {renderSectionHeader("Two-Factor Authentication")}
      {!twoFAEnabled && twoFAStep === "idle" && (
        <div className="st-2fa-card">
          <p className="st-2fa-desc">Add an extra layer of security to your account using an authenticator app (Google Authenticator, Authy, etc.)</p>
          <button className="st-btn st-btn--green" onClick={handleSetup2FA} disabled={twoFALoading}>
            {twoFALoading ? "Loading..." : "Enable 2FA"}
          </button>
        </div>
      )}
      {twoFAStep === "scan" && (
        <div className="st-2fa-card">
          <p className="st-2fa-desc">Scan this QR code with your authenticator app, then enter the 6-digit code below.</p>
          <div className="st-2fa-qr-wrap">
            <img src={twoFAQr} alt="2FA QR Code" className="st-2fa-qr-img" />
          </div>
          <p className="st-2fa-desc" style={{ fontSize: "12px" }}>Or enter this key manually: <code className="st-2fa-key">{twoFASecret}</code></p>
          <div className="st-2fa-verify-row">
            <input className="st-input" style={{ width: "160px", textAlign: "center", letterSpacing: "4px" }} type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={twoFACode} onChange={e => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            <button className="st-btn st-btn--green" onClick={handleVerify2FA} disabled={twoFALoading || twoFACode.length < 6}>
              {twoFALoading ? "Verifying..." : "Verify & Enable"}
            </button>
          </div>
        </div>
      )}
      {twoFAStep === "backup" && (
        <div className="st-2fa-card">
          <p className="st-2fa-desc" style={{ color: "#fbbf24" }}>Save these backup codes in a safe place. Each can be used once if you lose access to your authenticator app.</p>
          <div className="st-2fa-codes">
            {twoFABackupCodes.map((code, i) => (
              <code key={i} className="st-backup-code">{code}</code>
            ))}
          </div>
          <div className="st-2fa-verify-row">
            <button className="st-btn st-btn--dark" onClick={() => { navigator.clipboard.writeText(twoFABackupCodes.join("\n")); showToast("Codes copied!"); }}>Copy All</button>
            <button className="st-btn st-btn--dark" onClick={() => { const blob = new Blob([twoFABackupCodes.join("\n")], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "backup-codes.txt"; a.click(); }}>Download</button>
          </div>
          <button className="st-btn st-btn--green" style={{ marginTop: "1rem" }} onClick={() => { setTwoFAStep("idle"); setTwoFACode(""); setTwoFASecret(""); setTwoFAQr(""); }}>Done</button>
        </div>
      )}
      {twoFAEnabled && twoFAStep === "idle" && (
        <div className="st-2fa-card" style={{ borderColor: "rgba(74,222,128,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <CheckCircle size={20} color="#4ade80" />
            <span style={{ color: "#4ade80", fontWeight: 600 }}>2FA is enabled</span>
          </div>
          <input className="st-input" style={{ width: "200px", marginBottom: "0.5rem" }} type="password" placeholder="Enter password to disable" value={twoFADisablePw} onChange={e => setTwoFADisablePw(e.target.value)} />
          <button className="st-btn st-btn--danger" onClick={handleDisable2FA} disabled={twoFALoading || !twoFADisablePw}>
            {twoFALoading ? "Disabling..." : "Disable 2FA"}
          </button>
        </div>
      )}

      <div className="st-divider" />
      {renderSectionHeader("Privacy")}
      {renderToggle("publicProfile", "Public profile", "Others can view your profile")}
      {renderToggle("showWatchlistPublic", "Show watchlist publicly", "Your anime list is visible to everyone")}
      {renderToggle("showActivityStatus", "Show activity status", "Others see when you're watching")}

      <div className="st-divider" />
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
          <div className="st-loading">
            <div className="st-loading-spinner" />
            <span>Loading settings...</span>
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
                <label className="st-check-label">
                  <input type="checkbox" checked={deleteConfirm} onChange={e => setDeleteConfirm(e.target.checked)} />
                  <span>I understand, delete my account</span>
                </label>
              </div>
              <div className="st-modal-foot">
                <button className="st-btn st-btn--dark" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="st-btn st-btn--danger" disabled={!deleteConfirm || deleting} onClick={handleDeleteAccount}>
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
