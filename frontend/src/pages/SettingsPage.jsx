import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import authService from "../services/authService";
import settingsService from "../services/settingsService";
import AnimatedPage from "../components/AnimatedPage";
import {
  User, Settings, Bell, Shield, Link2,
  Eye, EyeOff, LogOut, Sun, Moon, Monitor,
  CheckCircle, X, Trash2,
  AlertTriangle, QrCode, Copy,
  ChevronLeft, RefreshCw, ArrowRight, Mail,
} from "lucide-react";
import "./SettingsPage.css";

const DASHBOARD_CARDS = [
  { key: "account",       icon: User,     label: "Account",           desc: "Manage profile, email, bio",               color: "#667eea" },
  { key: "preferences",   icon: Settings, label: "Preferences",       desc: "Theme, display, playback",                 color: "#4ade80" },
  { key: "notifications", icon: Bell,     label: "Notifications",     desc: "Email, push, alerts",                      color: "#fbbf24" },
  { key: "privacy",       icon: Shield,   label: "Privacy & Security",desc: "2FA, password, privacy",                   color: "#ff6b6b" },
  { key: "sync",          icon: Link2,    label: "Sync & Apps",       desc: "MAL, AniList, auto-sync",                  color: "#00d4ff" },
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
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const [page, setPage] = useState("home");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const [settings, setSettings] = useState(() => settingsService.load());
  const syncInit = useRef(settingsService.loadSync());

  const [syncStates, setSyncStates] = useState({
    malSyncing: false, aniSyncing: false,
    malLastSync: syncInit.current.malLastSync,
    aniLastSync: syncInit.current.aniLastSync,
  });

  const [profile, setProfile] = useState(() => settingsService.loadUserProfile() || {
    username: currentUser?.username || "formula09",
    displayName: currentUser?.username || "formula09",
    email: "user@example.com",
    bio: "",
    website: "",
    emailVerified: true,
  });

  const [show2FA, setShow2FA] = useState(() => settingsService.get2FAStatus());
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState({ current: false, newPass: false, confirm: false });
  const [blockedSearch, setBlockedSearch] = useState("");
  const [pwFields, setPwFields] = useState({ current: "", newPass: "", confirm: "" });
  const [pwStrength, setPwStrength] = useState({ label: "", color: "", width: "0%" });
  const [pwErrors, setPwErrors] = useState([]);
  const [pwChanging, setPwChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    settingsService.save(settings);
  }, [settings]);

  const avatar = currentUser?.avatar || "";
  const initial = profile.username.charAt(0).toUpperCase();
  const joinDate = currentUser?.memberSince
    ? new Date(currentUser.memberSince).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "May 24, 2026";

  const toggle = (id) => setSettings(prev => ({ ...prev, [id]: !prev[id] }));
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
    navigate("/");
  };

  const handleSync = async (service) => {
    const key = service === "mal" ? "malSyncing" : "aniSyncing";
    setSyncStates(prev => ({ ...prev, [key]: true }));
    try {
      const fn = service === "mal" ? settingsService.syncWithMAL : settingsService.syncWithAniList;
      const result = await fn();
      setSyncStates(prev => ({
        ...prev,
        [key]: false,
        [`${service}LastSync`]: result.lastSync,
      }));
      showToast(`${service === "mal" ? "MAL" : "AniList"} synced successfully!`);
    } catch {
      setSyncStates(prev => ({ ...prev, [key]: false }));
      showToast("Sync failed. Try again.", "error");
    }
  };

  const connectService = (service) => {
    setTog(`${service}Connected`, true);
    showToast(`${service === "mal" ? "MAL" : "AniList"} connected!`);
    handleSync(service);
  };

  const disconnectService = (service) => {
    setTog(`${service}Connected`, false);
    setSyncStates(prev => ({ ...prev, [`${service}LastSync`]: null }));
    showToast(`${service === "mal" ? "MAL" : "AniList"} disconnected.`, "info");
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

  const handle2FAToggle = () => {
    const next = !show2FA;
    setShow2FA(next);
    settingsService.toggle2FA(next);
    showToast(next ? "2FA enabled" : "2FA disabled");
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

  const handleSavePreferences = () => {
    settingsService.save(settings);
    showToast("Preferences saved!");
  };

  const back = () => setPage("home");

  const renderNavbar = () => (
    <nav className="st-navbar">
      <div className="st-navbar-inner">
        <div className="st-logo">AnimeWch</div>
        <div className="st-search-bar">
          <input className="st-search-input" placeholder="Search settings..." />
        </div>
        <div className="st-navbar-right">
          <button className="st-nav-icon"><Bell size={20} /></button>
          <div className="st-nav-avatar">{initial}</div>
        </div>
      </div>
    </nav>
  );

  const renderDashboard = () => (
    <motion.div className="st-dashboard" variants={stagger} initial="initial" animate="animate">
      <motion.h1 className="st-page-title" variants={cardItem}>Settings</motion.h1>
      <motion.p className="st-page-sub" variants={cardItem}>Manage your account, preferences, and connected services.</motion.p>
      <div className="st-card-grid">
        {DASHBOARD_CARDS.map(({ key, icon: Icon, label, desc, color }) => (
          <motion.button
            key={key}
            className="st-dash-card"
            variants={cardItem}
            whileHover={{ scale: 1.04, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setPage(key)}
          >
            <div className="st-dash-card-icon" style={{ background: `${color}20`, color }}>
              <Icon size={32} />
            </div>
            <div className="st-dash-card-body">
              <span className="st-dash-card-title">{label}</span>
              <span className="st-dash-card-desc">{desc}</span>
            </div>
            <ArrowRight size={18} className="st-dash-card-arrow" style={{ color }} />
          </motion.button>
        ))}
      </div>
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
              {profile.emailVerified && <span className="st-verify-date">Verified on May 25, 2026</span>}
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

      <div className="st-divider" />

      <div className="st-danger-card">
        <div className="st-danger-inner">
          <h4 className="st-danger-title">Danger Zone</h4>
          <p className="st-danger-desc">Delete your account permanently. This action cannot be undone.</p>
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

      <h3 className="st-section-title">Display</h3>
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
      <h3 className="st-section-title">Video Player</h3>
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
      <h3 className="st-section-title">Content</h3>
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
      <h3 className="st-section-title">Anime List</h3>
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

      <h3 className="st-section-title">Email Notifications</h3>
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
      <h3 className="st-section-title">Push Notifications</h3>
      <p className="st-section-desc">Requires browser permission.</p>
      {renderToggle("pushNotifs", "Enable push notifications", "Receive browser push notifications")}
      {settings.pushNotifs && (
        <div className="st-sub-toggles">
          {renderToggle("newEpisodeAlerts", "New episodes", "Instant alerts for new episodes")}
          {renderToggle("dms", "Direct messages", "Notifications for direct messages")}
          {renderToggle("commentReplies", "Comment replies", "When someone replies to your comment")}
          {renderToggle("friendRequests", "Friend requests", "When someone sends you a friend request")}
          {renderToggle("achievements", "Achievement unlocked", "When you earn a new achievement")}
        </div>
      )}

      <div className="st-divider" />
      <h3 className="st-section-title">Newsletter</h3>
      {renderToggle("newsletterSub", "Subscribe to newsletter", "Weekly recommendations and updates")}
      {settings.newsletterSub && (
        <div className="st-sub-toggles">
          {renderToggle("animeRecs", "Anime recommendations", "Personalized anime suggestions")}
          {renderToggle("newFeatures", "New features announcement", "Updates about new platform features")}
          <div className="st-field">
            <label className="st-field-label">Frequency</label>
            <div className="st-radio-group">
              {["Weekly", "Bi-weekly", "Monthly", "Never"].map(f => (
                <button key={f} className={`st-radio ${settings.notifFreq === f ? "active" : ""}`}
                  onClick={() => setTog("notifFreq", f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="st-divider" />
      <h3 className="st-section-title">Do Not Disturb</h3>
      {renderToggle("dndMode", "Enable DND mode", "No notifications during this time")}
      {settings.dndMode && (
        <div className="st-dnd-row">
          <div className="st-field">
            <label className="st-field-label">From</label>
            <input className="st-input" type="time" value={settings.dndFrom} onChange={e => setTog("dndFrom", e.target.value)} />
          </div>
          <div className="st-field">
            <label className="st-field-label">To</label>
            <input className="st-input" type="time" value={settings.dndTo} onChange={e => setTog("dndTo", e.target.value)} />
          </div>
        </div>
      )}
    </motion.div>
  );

  const renderPrivacy = () => (
    <motion.div key="privacy" className="st-page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <h1 className="st-page-title">Privacy & Security</h1>

      <h3 className="st-section-title">Two-Factor Authentication</h3>
      <div className="st-card-2fa">
        <div className="st-2fa-header">
          <div className="st-2fa-info">
            <span className="st-2fa-status-label">Status</span>
            <span className={`st-badge ${show2FA ? "st-badge--green" : "st-badge--red"}`}>
              {show2FA ? "Enabled" : "Not Enabled"}
            </span>
            <p className="st-2fa-desc">Add extra security to your account</p>
          </div>
          <button className={`st-btn ${show2FA ? "st-btn--danger" : "st-btn--green"}`} onClick={handle2FAToggle}>
            {show2FA ? "Disable 2FA" : "Enable 2FA"}
          </button>
        </div>
        {show2FA && (
          <div className="st-2fa-setup">
            <div className="st-2fa-qr"><QrCode size={180} /></div>
            <p className="st-2fa-instruction">Scan with authenticator app (Google Authenticator, Authy, etc.)</p>
            <div className="st-2fa-key-box">
              <code className="st-2fa-key">JBSWY3DPEHPK3PXP</code>
              <button className="st-icon-btn" onClick={() => { navigator.clipboard.writeText("JBSWY3DPEHPK3PXP"); showToast("Key copied!"); }}><Copy size={16} /></button>
            </div>
            <div className="st-2fa-backup">
              <button className="st-btn st-btn--dark" onClick={() => setShowBackupCodes(!showBackupCodes)}>
                {showBackupCodes ? "Hide Backup Codes" : "Show Backup Codes"}
              </button>
              {showBackupCodes && (
                <div className="st-backup-grid">
                  {["ABCD-1234-EFGH", "IJKL-5678-MNOP", "QRST-9012-UVWX", "YZAB-3456-CDEF"].map(c => (
                    <code key={c} className="st-backup-code">{c}</code>
                  ))}
                  <div className="st-backup-actions">
                    <button className="st-btn st-btn--dark st-btn--sm" onClick={() => { const codes = ["ABCD-1234-EFGH", "IJKL-5678-MNOP", "QRST-9012-UVWX", "YZAB-3456-CDEF"].join("\n"); navigator.clipboard.writeText(codes); showToast("Backup codes copied!"); }}>Copy All</button>
                    <button className="st-btn st-btn--dark st-btn--sm" onClick={() => { const blob = new Blob(["Backup Codes:\n\nABCD-1234-EFGH\nIJKL-5678-MNOP\nQRST-9012-UVWX\nYZAB-3456-CDEF"], { type: "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "backup-codes.txt"; a.click(); }}>Download</button>
                  </div>
                  <p className="st-backup-warn">Save these codes in a safe place</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="st-divider" />
      <h3 className="st-section-title">Privacy</h3>
      {renderToggle("publicProfile", "Public profile", "Others can view your profile")}
      {renderToggle("showWatchlistPublic", "Show watchlist publicly", "Your anime list is visible to everyone")}
      {renderToggle("showActivityStatus", "Show activity status", "Others see when you're watching")}
      <div className="st-field">
        <label className="st-field-label">Allow messaging from</label>
        <div className="st-radio-group">
          {["anyone", "friends", "nobody"].map(opt => (
            <button key={opt} className={`st-radio ${settings.allowMessaging === opt ? "active" : ""}`}
              onClick={() => setTog("allowMessaging", opt)}>
              {opt === "anyone" ? "Anyone" : opt === "friends" ? "Friends only" : "Nobody"}
            </button>
          ))}
        </div>
      </div>

      <div className="st-divider" />
      <h3 className="st-section-title">Password</h3>
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

      <div className="st-divider" />
      <h3 className="st-section-title">Blocked Users</h3>
      <input className="st-input st-input--search" placeholder="Search blocked users..." value={blockedSearch} onChange={e => setBlockedSearch(e.target.value)} />
      <div className="st-blocked-empty">No blocked users</div>
    </motion.div>
  );

  const renderSync = () => (
    <motion.div key="sync" className="st-page" variants={pageVariants} initial="initial" animate="animate" exit="exit">
      <h1 className="st-page-title">Sync & Connected Apps</h1>

      <h3 className="st-section-title">MyAnimeList (MAL)</h3>
      <div className="st-sync-card">
        <div className="st-sync-card-left">
          <div className="st-sync-logo mal">MAL</div>
          <div className="st-sync-info">
            <span className="st-sync-name">MyAnimeList (MAL)</span>
            <span className={`st-badge ${settings.malConnected ? "st-badge--green" : ""}`}>
              {settings.malConnected ? "Connected" : "Not Connected"}
            </span>
            {syncStates.malLastSync && <span className="st-sync-last">Last synced: {syncStates.malLastSync}</span>}
            <div className="st-sync-features">
              <span>Import watchlist</span>
              <span>Export watchlist</span>
              <span>Auto-sync support</span>
            </div>
          </div>
        </div>
        <div className="st-sync-card-right">
          {!settings.malConnected ? (
            <button className="st-btn st-btn--green" onClick={() => connectService("mal")}>
              Connect to MAL
            </button>
          ) : (
            <div className="st-sync-actions">
              <button className="st-btn st-btn--cyan" onClick={() => handleSync("mal")} disabled={syncStates.malSyncing}>
                <RefreshCw size={16} className={syncStates.malSyncing ? "st-spin" : ""} />
                {syncStates.malSyncing ? "Syncing..." : "Sync Now"}
              </button>
              <button className="st-btn st-btn--dark" onClick={() => disconnectService("mal")}>
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="st-section-title">AniList</h3>
      <div className="st-sync-card">
        <div className="st-sync-card-left">
          <div className="st-sync-logo ani">AniL</div>
          <div className="st-sync-info">
            <span className="st-sync-name">AniList</span>
            <span className={`st-badge ${settings.aniConnected ? "st-badge--green" : ""}`}>
              {settings.aniConnected ? "Connected" : "Not Connected"}
            </span>
            {syncStates.aniLastSync && <span className="st-sync-last">Last synced: {syncStates.aniLastSync}</span>}
            <div className="st-sync-features">
              <span>Real-time sync</span>
              <span>Two-way sync</span>
              <span>Automatic updates</span>
            </div>
          </div>
        </div>
        <div className="st-sync-card-right">
          {!settings.aniConnected ? (
            <button className="st-btn st-btn--green" onClick={() => connectService("ani")}>
              Connect to AniList
            </button>
          ) : (
            <div className="st-sync-actions">
              <button className="st-btn st-btn--cyan" onClick={() => handleSync("ani")} disabled={syncStates.aniSyncing}>
                <RefreshCw size={16} className={syncStates.aniSyncing ? "st-spin" : ""} />
                {syncStates.aniSyncing ? "Syncing..." : "Sync Now"}
              </button>
              <button className="st-btn st-btn--dark" onClick={() => disconnectService("ani")}>
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="st-divider" />
      <h3 className="st-section-title">Auto-Sync Options</h3>
      {(settings.malConnected || settings.aniConnected) ? (
        <>
          {renderToggle("autoSyncEpisode", "Auto-sync when episode finishes", "Update MAL/AniList when you finish watching")}
          {renderToggle("autoSyncInterval", "Auto-sync every 6 hours", "Periodically sync your watchlist")}
          {renderToggle("autoSyncStartup", "Sync on app startup", "Automatically sync when you open AnimeWch")}
          {renderToggle("autoSyncShutdown", "Sync on shutdown", "Sync before closing the app")}
        </>
      ) : (
        <p className="st-section-desc">Connect at least one service to enable auto-sync options.</p>
      )}

      <div className="st-divider" />
      <h3 className="st-section-title">Sync Information</h3>
      <div className="st-info-card">
        <p><strong>Manual sync</strong> takes 2-5 minutes</p>
        <p><strong>Auto-sync</strong> runs in background (max once per hour)</p>
        <p><strong>Latest changes synced:</strong> {syncStates.malLastSync || syncStates.aniLastSync || "Never"}</p>
        <p className="st-info-ok"><CheckCircle size={14} /> Sync status: All synced</p>
      </div>

      <div className="st-divider" />
      <h3 className="st-section-title">Other Services</h3>
      <div className="st-other-grid">
        <div className="st-other-card">
          <div className="st-other-icon" style={{ background: "#5865F220", color: "#5865F2" }}>
            <Mail size={24} />
          </div>
          <span className="st-other-name">Discord</span>
          <span className="st-other-desc">Connect for notifications</span>
          <button className="st-btn st-btn--dark st-btn--sm">Coming Soon</button>
        </div>
        <div className="st-other-card">
          <div className="st-other-icon" style={{ background: "#1DA1F220", color: "#1DA1F2" }}>
            <Mail size={24} />
          </div>
          <span className="st-other-name">Twitter / X</span>
          <span className="st-other-desc">Share your watchlist</span>
          <button className="st-btn st-btn--dark st-btn--sm">Coming Soon</button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <AnimatedPage>
      <div className="st">
        {renderNavbar()}

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
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div className="st-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteModal(false)}>
            <motion.div className="st-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="st-modal-head">
                <h3>Delete Account</h3>
                <button className="st-modal-close" onClick={() => setShowDeleteModal(false)} disabled={deleting}><X size={16} /></button>
              </div>
              <div className="st-modal-body">
                <div className="st-modal-icon"><AlertTriangle size={40} /></div>
                <p className="st-modal-desc">This action cannot be undone. Your account will be permanently deleted after a 30-day cancellation period.</p>
                <div className="st-field">
                  <select className="st-input">
                    <option value="">Select a reason (optional)</option>
                    <option>Not using the service enough</option>
                    <option>Too expensive</option>
                    <option>Privacy concerns</option>
                    <option>Found an alternative</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="st-field">
                  <label className="st-check-label">
                    <input type="checkbox" checked={deleteConfirm} onChange={e => setDeleteConfirm(e.target.checked)} disabled={deleting} />
                    <span>I understand this cannot be undone</span>
                  </label>
                </div>
              </div>
              <div className="st-modal-foot">
                <button className="st-btn st-btn--dark" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</button>
                <button className="st-btn st-btn--danger" onClick={handleDeleteAccount} disabled={!deleteConfirm || deleting}>
                  {deleting ? "Deleting..." : "Confirm Deletion"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
}
