import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import authService from "../services/authService";
import AnimatedPage from "../components/AnimatedPage";
import {
  User, Settings, Bell, Shield, Link2, FileText, CreditCard, HelpCircle,
  Eye, EyeOff, LogOut, Sun, Moon, Monitor, SkipForward, SkipBack,
  Volume2, Upload, Download, CheckCircle, X, Search, Trash2,
  Smartphone, Globe, Clock, AlertTriangle, QrCode, Copy,
  ChevronDown, ChevronRight, MessageSquare, Gift, Film,
} from "lucide-react";
import "./SettingsPage.css";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const fadeIn = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

const SIDEBAR_ITEMS = [
  { key: "account",           label: "Account",           icon: User },
  { key: "preferences",       label: "Preferences",       icon: Settings },
  { key: "notifications",     label: "Notifications",     icon: Bell },
  { key: "privacy",           label: "Privacy & Security", icon: Shield },
  { key: "connected",         label: "Connected Apps",    icon: Link2 },
  { key: "data",              label: "Data & Privacy",    icon: FileText },
  { key: "billing",           label: "Billing",           icon: CreditCard },
  { key: "help",              label: "Help & Support",    icon: HelpCircle },
];

const THEME_ACCENTS = [
  { label: "Purple", value: "#667eea" },
  { label: "Cyan", value: "#00d4ff" },
  { label: "Green", value: "#4ade80" },
  { label: "Pink", value: "#f472b6" },
];

const FONT_SIZES = [
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" },
  { label: "Extra Large", value: "xlarge" },
];

const CONTENT_RATINGS = ["G", "PG", "PG-13", "R", "R+ (17+)", "Rx (18+)"];
const LIST_VIEWS = ["Grid view", "List view", "Compact view"];
const FREQ_OPTIONS = ["Weekly", "Monthly", "Never"];
const HISTORY_FILTERS = ["Last 7 days", "Last 30 days", "Last 90 days", "All time"];

export default function SettingsPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const [activePage, setActivePage] = useState("account");
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState(currentUser?.username || "formula09");
  const [displayName, setDisplayName] = useState(currentUser?.username || "formula09");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("user@example.com");
  const [emailVerified, setEmailVerified] = useState(true);
  const [show2FA, setShow2FA] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [blockedSearch, setBlockedSearch] = useState("");
  const [faqSearch, setFaqSearch] = useState("");
  const [faqOpen, setFaqOpen] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState({ current: false, newPass: false, confirm: false });
  const [dndFrom, setDndFrom] = useState("22:00");
  const [dndTo, setDndTo] = useState("08:00");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const [toggles, setToggles] = useState({
    darkMode: "auto",
    autoNext: true, skipIntro: false, skipOutro: false, showSubtitles: true,
    disableAds: false, showComments: true, hideNsfw: true, showMatureWarnings: true,
    showEpisodeProgress: true, showRatingsCards: true,
    emailNotifs: true, newEpisodes: true, communityActivity: false,
    friendsActivity: false, systemUpdates: true,
    pushNotifs: true, newEpisodeAlerts: true, dms: false,
    commentReplies: true, friendRequests: true,
    newsletterSub: false, animeRecs: false, newFeatures: false,
    dndMode: false, publicProfile: true, showWatchlistPublic: true,
    allowMessaging: "anyone", showActivityStatus: true, showLastActive: false,
    defaultDubbed: "subbed", contentRating: "PG-13", defaultListView: "Grid view",
    notifFreq: "Weekly",
  });

  const avatar = currentUser?.avatar || "";
  const initial = username.charAt(0).toUpperCase();
  const joinDate = currentUser?.memberSince
    ? new Date(currentUser.memberSince).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Jan 1, 1970";

  const toggleSwitch = (id) => setToggles(prev => ({ ...prev, [id]: !prev[id] }));
  const setToggle = (id, val) => setToggles(prev => ({ ...prev, [id]: val }));
  const togglePasswordVisibility = (f) => setShowPassword(prev => ({ ...prev, [f]: !prev[f] }));
  const handleLogout = async () => { await authService.logout(); navigate("/"); };

  return (
    <AnimatedPage>
      <div className="sp">
        <div className="sp-layout">
          {/* ─── Sidebar ─── */}
          <motion.aside
            className="sp-sidebar"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <div className="sp-sidebar-title">SETTINGS</div>
            <nav className="sp-sidebar-nav">
              {SIDEBAR_ITEMS.map(({ key, label, icon: Icon }) => (
                <motion.button
                  key={key}
                  variants={fadeIn}
                  className={`sp-sidebar-item ${activePage === key ? "active" : ""}`}
                  onClick={() => setActivePage(key)}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </motion.button>
              ))}
            </nav>
          </motion.aside>

          {/* ─── Main Content ─── */}
          <motion.main
            className="sp-content"
            key={activePage}
            variants={stagger}
            initial="hidden"
            animate="show"
          >

          {/* ════════════════════════════════════════════
              PAGE 1: ACCOUNT
          ════════════════════════════════════════════ */}
          {activePage === "account" && (
            <section className="sp-section">
              <h1 className="sp-page-title">Account</h1>

              {/* User Card */}
              <div className="sp-card">
                <div className="sp-card-row">
                  <div className="sp-user-avatar-wrap">
                    <div className="sp-user-avatar-lg">
                      {avatar ? <img src={avatar} alt={username} /> : <span>{initial}</span>}
                    </div>
                    <div className="sp-user-detail">
                      <span className="sp-user-label">Synced To Cloud</span>
                      <span className="sp-user-name">{username}</span>
                      <span className="sp-user-joined">Joined {joinDate}</span>
                    </div>
                  </div>
                  <button className="sp-btn sp-btn--danger" onClick={handleLogout}>
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </div>

              {/* Account Information */}
              <h3 className="sp-section-title">Account Information</h3>
              <div className="sp-form">
                <div className="sp-field">
                  <label className="sp-field-label">Username</label>
                  <span className="sp-field-hint">3-10 characters, letters and numbers only.</span>
                  <input className="sp-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" />
                </div>
                <div className="sp-field">
                  <label className="sp-field-label">Display Name</label>
                  <span className="sp-field-hint">How others see your name.</span>
                  <input className="sp-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Enter display name" />
                </div>
                <div className="sp-field">
                  <label className="sp-field-label">Email Address</label>
                  <span className="sp-field-hint">Your primary email address.</span>
                  <div className="sp-input-row">
                    <input className="sp-input sp-input--flex" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter email" />
                    {!emailVerified && <button className="sp-btn sp-btn--amber">Verify Email</button>}
                  </div>
                  <div className="sp-verify-status">
                    <span className={`sp-badge ${emailVerified ? "sp-badge--green" : "sp-badge--red"}`}>
                      {emailVerified ? "Verified" : "Unverified"}
                    </span>
                    {emailVerified && <span className="sp-verify-date">Verified on May 25, 2026</span>}
                  </div>
                </div>
              </div>

              <div className="sp-divider" />

              {/* Bio */}
              <h3 className="sp-section-title">Bio</h3>
              <div className="sp-field">
                <span className="sp-field-hint">Tell others a bit about you.</span>
                <textarea className="sp-textarea" value={bio} onChange={e => setBio(e.target.value)} placeholder="Write something about yourself..." maxLength={500} />
                <span className="sp-char-count">{bio.length}/500</span>
              </div>

              <div className="sp-divider" />

              {/* Website */}
              <h3 className="sp-section-title">Website</h3>
              <div className="sp-field">
                <input className="sp-input" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" />
              </div>

              <div className="sp-divider" />

              {/* Danger Zone */}
              <div className="sp-danger-card">
                <div className="sp-danger-card-inner">
                  <h4 className="sp-danger-title">Danger Zone</h4>
                  <p className="sp-danger-desc">Delete your account permanently. This action cannot be undone.</p>
                  <button className="sp-btn sp-btn--danger-outline" onClick={() => setShowDeleteModal(true)}>
                    <Trash2 size={16} /> Delete Account
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ════════════════════════════════════════════
              PAGE 2: PREFERENCES
          ════════════════════════════════════════════ */}
          {activePage === "preferences" && (
            <section className="sp-section">
              <h1 className="sp-page-title">Preferences</h1>

              {/* Display Settings */}
              <h3 className="sp-section-title">Display Settings</h3>
              <div className="sp-form">
                <div className="sp-field">
                  <label className="sp-field-label">Theme</label>
                  <span className="sp-field-hint">System preference follows your device settings.</span>
                  <div className="sp-theme-options">
                    {[
                      { id: "light", icon: Sun, label: "Light" },
                      { id: "dark", icon: Moon, label: "Dark" },
                      { id: "auto", icon: Monitor, label: "Auto" },
                    ].map(({ id, icon: Icon, label }) => (
                      <button
                        key={id}
                        className={`sp-theme-option ${toggles.darkMode === id ? "active" : ""}`}
                        onClick={() => setToggle("darkMode", id)}
                      >
                        <Icon size={20} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sp-field">
                  <label className="sp-field-label">Font Size</label>
                  <div className="sp-radio-group">
                    {FONT_SIZES.map(fs => (
                      <button key={fs.value} className={`sp-radio-btn ${toggles.fontSize === fs.value ? "active" : ""}`}
                        onClick={() => setToggle("fontSize", fs.value)}>
                        {fs.label}
                      </button>
                    ))}
                  </div>
                  <div className="sp-font-preview" style={{ fontSize: toggles.fontSize === "small" ? 12 : toggles.fontSize === "large" ? 18 : toggles.fontSize === "xlarge" ? 22 : 14 }}>
                    Preview text showing selected size
                  </div>
                </div>

                <div className="sp-field">
                  <label className="sp-field-label">Theme Accent Color</label>
                  <div className="sp-accent-options">
                    {THEME_ACCENTS.map(a => (
                      <button key={a.value} className={`sp-accent-option ${toggles.accentColor === a.value ? "active" : ""}`}
                        onClick={() => setToggle("accentColor", a.value)} style={{ background: a.value }}>
                        {toggles.accentColor === a.value && <CheckCircle size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sp-divider" />

              {/* Video Player */}
              <h3 className="sp-section-title">Video Player</h3>
              <div className="sp-toggles-list">
                {[
                  { id: "autoNext", title: "Auto play next episode", desc: "Automatically play the next episode." },
                  { id: "skipIntro", title: "Skip intro automatically", desc: "Automatically skip opening sequences." },
                  { id: "skipOutro", title: "Skip outro automatically", desc: "Automatically skip ending sequences." },
                  { id: "showSubtitles", title: "Show subtitles by default", desc: "Display subtitles on all content." },
                ].map(item => (
                  <div key={item.id} className="sp-toggle-row">
                    <div className="sp-toggle-info">
                      <span className="sp-toggle-title">{item.title}</span>
                      <span className="sp-toggle-desc">{item.desc}</span>
                    </div>
                    <button className={`sp-toggle ${toggles[item.id] ? "active" : ""}`} onClick={() => toggleSwitch(item.id)}>
                      <span className="sp-toggle-knob" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="sp-field" style={{ marginTop: "1rem" }}>
                <label className="sp-field-label">Default Audio</label>
                <div className="sp-select-group">
                  {["subbed", "dubbed", "nopreference"].map(opt => (
                    <button key={opt} className={`sp-radio-btn ${toggles.defaultDubbed === opt ? "active" : ""}`}
                      onClick={() => setToggle("defaultDubbed", opt)}>
                      {opt === "subbed" ? "Prefer Subbed" : opt === "dubbed" ? "Prefer Dubbed" : "No preference"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sp-field">
                <label className="sp-field-label">Playback Speed</label>
                <div className="sp-radio-group">
                  {[0.75, 1, 1.25, 1.5, 2].map(speed => (
                    <button key={speed} className={`sp-radio-btn ${playbackSpeed === speed ? "active" : ""}`}
                      onClick={() => setPlaybackSpeed(speed)}>
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="sp-divider" />

              {/* Content */}
              <h3 className="sp-section-title">Content</h3>
              <div className="sp-toggles-list">
                {[
                  { id: "disableAds", title: "Disable Ads", desc: "Remove advertisements across the platform." },
                  { id: "showComments", title: "Show comments section", desc: "Display community comments on watch pages." },
                  { id: "hideNsfw", title: "Hide NSFW content", desc: "Filter out adult content." },
                  { id: "showMatureWarnings", title: "Show mature content warnings", desc: "Display warnings for mature content." },
                ].map(item => (
                  <div key={item.id} className="sp-toggle-row">
                    <div className="sp-toggle-info">
                      <span className="sp-toggle-title">{item.title}</span>
                      <span className="sp-toggle-desc">{item.desc}</span>
                    </div>
                    <button className={`sp-toggle ${toggles[item.id] ? "active" : ""}`} onClick={() => toggleSwitch(item.id)}>
                      <span className="sp-toggle-knob" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="sp-field" style={{ marginTop: "1rem" }}>
                <label className="sp-field-label">Content Rating Filter</label>
                <div className="sp-select-group sp-select-group--wrap">
                  {CONTENT_RATINGS.map(r => (
                    <button key={r} className={`sp-radio-btn ${toggles.contentRating === r ? "active" : ""}`}
                      onClick={() => setToggle("contentRating", r)}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sp-divider" />

              {/* Anime List */}
              <h3 className="sp-section-title">Anime List</h3>
              <div className="sp-field">
                <label className="sp-field-label">Default list view</label>
                <div className="sp-radio-group">
                  {LIST_VIEWS.map(v => (
                    <button key={v} className={`sp-radio-btn ${toggles.defaultListView === v ? "active" : ""}`}
                      onClick={() => setToggle("defaultListView", v)}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              {[
                { id: "showEpisodeProgress", title: "Show episode progress", desc: "Display progress on anime cards." },
                { id: "showRatingsCards", title: "Show ratings on cards", desc: "Display star ratings on anime cards." },
              ].map(item => (
                <div key={item.id} className="sp-toggle-row">
                  <div className="sp-toggle-info">
                    <span className="sp-toggle-title">{item.title}</span>
                    <span className="sp-toggle-desc">{item.desc}</span>
                  </div>
                  <button className={`sp-toggle ${toggles[item.id] ? "active" : ""}`} onClick={() => toggleSwitch(item.id)}>
                    <span className="sp-toggle-knob" />
                  </button>
                </div>
              ))}
            </section>
          )}

          {/* ════════════════════════════════════════════
              PAGE 3: NOTIFICATIONS
          ════════════════════════════════════════════ */}
          {activePage === "notifications" && (
            <section className="sp-section">
              <h1 className="sp-page-title">Notifications</h1>

              <h3 className="sp-section-title">Email Notifications</h3>
              <div className="sp-toggles-list">
                {[
                  { id: "emailNotifs", title: "Enable email notifications", desc: "Receive notifications via email." },
                  { id: "newEpisodes", title: "New episodes of watched anime", desc: "Get notified when new episodes air." },
                  { id: "communityActivity", title: "Community activity (comments, likes)", desc: "Replies, mentions, and reactions." },
                  { id: "friendsActivity", title: "Friends activity", desc: "See what your friends are watching." },
                  { id: "systemUpdates", title: "System updates and announcements", desc: "Platform changes and new features." },
                ].map(item => (
                  <div key={item.id} className="sp-toggle-row">
                    <div className="sp-toggle-info">
                      <span className="sp-toggle-title">{item.title}</span>
                      <span className="sp-toggle-desc">{item.desc}</span>
                    </div>
                    <button className={`sp-toggle ${toggles[item.id] ? "active" : ""}`} onClick={() => toggleSwitch(item.id)}>
                      <span className="sp-toggle-knob" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="sp-divider" />

              <h3 className="sp-section-title">Push Notifications</h3>
              <p className="sp-section-desc">Requires browser permission.</p>
              <div className="sp-toggles-list">
                {[
                  { id: "pushNotifs", title: "Enable push notifications", desc: "Receive browser push notifications." },
                  { id: "newEpisodeAlerts", title: "New episode alerts", desc: "Instant alerts for new episodes." },
                  { id: "dms", title: "Direct messages", desc: "Notifications for direct messages." },
                  { id: "commentReplies", title: "Comment replies", desc: "When someone replies to your comment." },
                  { id: "friendRequests", title: "Friend requests", desc: "When someone sends you a friend request." },
                ].map(item => (
                  <div key={item.id} className="sp-toggle-row">
                    <div className="sp-toggle-info">
                      <span className="sp-toggle-title">{item.title}</span>
                      <span className="sp-toggle-desc">{item.desc}</span>
                    </div>
                    <button className={`sp-toggle ${toggles[item.id] ? "active" : ""}`} onClick={() => toggleSwitch(item.id)}>
                      <span className="sp-toggle-knob" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="sp-divider" />

              <h3 className="sp-section-title">Newsletter</h3>
              <div className="sp-toggles-list">
                <div className="sp-toggle-row">
                  <div className="sp-toggle-info">
                    <span className="sp-toggle-title">Subscribe to newsletter</span>
                    <span className="sp-toggle-desc">Weekly recommendations and updates.</span>
                  </div>
                  <button className={`sp-toggle ${toggles.newsletterSub ? "active" : ""}`} onClick={() => toggleSwitch("newsletterSub")}>
                    <span className="sp-toggle-knob" />
                  </button>
                </div>
                {toggles.newsletterSub && (
                  <>
                    {[
                      { id: "animeRecs", title: "Anime recommendations", desc: "Personalized anime suggestions." },
                      { id: "newFeatures", title: "New features announcement", desc: "Updates about new platform features." },
                    ].map(item => (
                      <div key={item.id} className="sp-toggle-row">
                        <div className="sp-toggle-info">
                          <span className="sp-toggle-title">{item.title}</span>
                          <span className="sp-toggle-desc">{item.desc}</span>
                        </div>
                        <button className={`sp-toggle ${toggles[item.id] ? "active" : ""}`} onClick={() => toggleSwitch(item.id)}>
                          <span className="sp-toggle-knob" />
                        </button>
                      </div>
                    ))}
                    <div className="sp-field">
                      <label className="sp-field-label">Frequency</label>
                      <div className="sp-radio-group">
                        {FREQ_OPTIONS.map(f => (
                          <button key={f} className={`sp-radio-btn ${toggles.notifFreq === f ? "active" : ""}`}
                            onClick={() => setToggle("notifFreq", f)}>
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="sp-divider" />

              <h3 className="sp-section-title">Do Not Disturb</h3>
              <div className="sp-toggle-row">
                <div className="sp-toggle-info">
                  <span className="sp-toggle-title">Enable DND mode</span>
                  <span className="sp-toggle-desc">No notifications during this time.</span>
                </div>
                <button className={`sp-toggle ${toggles.dndMode ? "active" : ""}`} onClick={() => toggleSwitch("dndMode")}>
                  <span className="sp-toggle-knob" />
                </button>
              </div>
              {toggles.dndMode && (
                <div className="sp-dnd-time">
                  <div className="sp-field">
                    <label className="sp-field-label">From</label>
                    <input className="sp-input" type="time" value={dndFrom} onChange={e => setDndFrom(e.target.value)} />
                  </div>
                  <div className="sp-field">
                    <label className="sp-field-label">To</label>
                    <input className="sp-input" type="time" value={dndTo} onChange={e => setDndTo(e.target.value)} />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ════════════════════════════════════════════
              PAGE 4: PRIVACY & SECURITY
          ════════════════════════════════════════════ */}
          {activePage === "privacy" && (
            <section className="sp-section">
              <h1 className="sp-page-title">Privacy & Security</h1>

              <h3 className="sp-section-title">Two-Factor Authentication (2FA)</h3>
              <div className="sp-card">
                <div className="sp-card-row">
                  <div className="sp-2fa-info">
                    <span className="sp-2fa-label">Status</span>
                    <span className={`sp-badge ${show2FA ? "sp-badge--green" : "sp-badge--red"}`}>
                      {show2FA ? "Enabled" : "Not Enabled"}
                    </span>
                    <p className="sp-2fa-desc">Add an extra layer of security to your account.</p>
                  </div>
                  <button className={`sp-btn ${show2FA ? "sp-btn--danger" : "sp-btn--green"}`} onClick={() => setShow2FA(!show2FA)}>
                    {show2FA ? "Disable 2FA" : "Enable 2FA"}
                  </button>
                </div>
                {show2FA && (
                  <div className="sp-2fa-setup">
                    <div className="sp-2fa-qr">
                      <QrCode size={120} />
                    </div>
                    <div className="sp-2fa-code">
                      <span>Setup Key</span>
                      <div className="sp-2fa-key-row">
                        <code className="sp-2fa-key">JBSWY3DPEHPK3PXP</code>
                        <button className="sp-icon-btn"><Copy size={16} /></button>
                      </div>
                    </div>
                    <div className="sp-2fa-backup">
                      <button className="sp-btn sp-btn--dark" onClick={() => setShowBackupCodes(!showBackupCodes)}>
                        {showBackupCodes ? "Hide Backup Codes" : "Show Backup Codes"}
                      </button>
                      {showBackupCodes && (
                        <div className="sp-backup-codes">
                          {["ABCD-1234-EFGH", "IJKL-5678-MNOP", "QRST-9012-UVWX", "YZAB-3456-CDEF"].map(c => (
                            <code key={c} className="sp-backup-code">{c}</code>
                          ))}
                          <button className="sp-btn sp-btn--dark mt-1">Generate New Codes</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="sp-divider" />

              {/* Active Sessions */}
              <h3 className="sp-section-title">Active Sessions</h3>
              <p className="sp-section-desc">Your account is logged in to these devices.</p>
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>Location</th>
                      <th>IP Address</th>
                      <th>Last Active</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { device: "Chrome on Windows", icon: Monitor, loc: "New York, US", ip: "192.168.1.1", active: "Active now" },
                      { device: "Safari on iPhone", icon: Smartphone, loc: "New York, US", ip: "10.0.0.1", active: "2 hours ago" },
                    ].map((s, i) => (
                      <tr key={i}>
                        <td><div className="sp-session-device"><s.icon size={16} /> {s.device}</div></td>
                        <td>{s.loc}</td>
                        <td><code className="sp-ip">{s.ip}</code></td>
                        <td><span className={s.active === "Active now" ? "sp-active-now" : ""}>{s.active}</span></td>
                        <td><button className="sp-btn sp-btn--sm sp-btn--dark">Sign Out</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="sp-btn sp-btn--danger-outline sp-btn--full mt-1">Sign out from all other devices</button>

              <div className="sp-divider" />

              {/* Login History */}
              <h3 className="sp-section-title">Login History</h3>
              <div className="sp-radio-group sp-radio-group--sm">
                {HISTORY_FILTERS.map(f => (
                  <button key={f} className={`sp-radio-btn ${toggles.historyFilter === f ? "active" : ""}`}
                    onClick={() => setToggle("historyFilter", f)}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Device</th>
                      <th>Location</th>
                      <th>IP</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { time: "May 24, 2026 14:32", device: "Chrome / Windows", loc: "New York, US", ip: "192.168.1.1", status: "Success" },
                      { time: "May 23, 2026 09:15", device: "Safari / iOS", loc: "New York, US", ip: "10.0.0.1", status: "Success" },
                      { time: "May 22, 2026 03:41", device: "Firefox / Windows", loc: "Moscow, RU", ip: "87.250.250.242", status: "Failed" },
                    ].map((h, i) => (
                      <tr key={i}>
                        <td>{h.time}</td>
                        <td>{h.device}</td>
                        <td>{h.loc}</td>
                        <td><code className="sp-ip">{h.ip}</code></td>
                        <td><span className={`sp-badge ${h.status === "Success" ? "sp-badge--green" : "sp-badge--red"}`}>{h.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="sp-alert sp-alert--warning">
                <AlertTriangle size={16} /> Suspicious activity detected — unrecognized login from Moscow, RU
              </div>

              <div className="sp-divider" />

              {/* Privacy Settings */}
              <h3 className="sp-section-title">Privacy Settings</h3>
              <div className="sp-toggles-list">
                {[
                  { id: "publicProfile", title: "Public profile", desc: "Others can view your profile and watchlist." },
                  { id: "showWatchlistPublic", title: "Show watchlist publicly", desc: "Your anime list is visible to everyone." },
                  { id: "showActivityStatus", title: "Show activity status", desc: "Others see when you're watching anime." },
                  { id: "showLastActive", title: "Show last active time", desc: "Display when you were last online." },
                ].map(item => (
                  <div key={item.id} className="sp-toggle-row">
                    <div className="sp-toggle-info">
                      <span className="sp-toggle-title">{item.title}</span>
                      <span className="sp-toggle-desc">{item.desc}</span>
                    </div>
                    <button className={`sp-toggle ${toggles[item.id] ? "active" : ""}`} onClick={() => toggleSwitch(item.id)}>
                      <span className="sp-toggle-knob" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="sp-field">
                <label className="sp-field-label">Allow messaging from</label>
                <div className="sp-radio-group">
                  {["anyone", "friends", "nobody"].map(opt => (
                    <button key={opt} className={`sp-radio-btn ${toggles.allowMessaging === opt ? "active" : ""}`}
                      onClick={() => setToggle("allowMessaging", opt)}>
                      {opt === "anyone" ? "Anyone" : opt === "friends" ? "Friends only" : "Nobody"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sp-divider" />

              {/* Blocked Users */}
              <h3 className="sp-section-title">Blocked Users</h3>
              <div className="sp-search-field">
                <Search size={16} />
                <input className="sp-input sp-input--search" placeholder="Search blocked users..." value={blockedSearch} onChange={e => setBlockedSearch(e.target.value)} />
              </div>
              <div className="sp-blocked-list">
                <div className="sp-blocked-empty">No blocked users</div>
              </div>

              <div className="sp-divider" />

              {/* Change Password */}
              <h3 className="sp-section-title">Change Password</h3>
              <div className="sp-card">
                <div className="sp-form">
                  <div className="sp-field">
                    <label className="sp-field-label">Current Password</label>
                    <span className="sp-field-hint">Enter your existing password to verify your identity.</span>
                    <div className="sp-password-wrap">
                      <input className="sp-input" type={showPassword.current ? "text" : "password"} placeholder="Current password" />
                      <button className="sp-password-toggle" onClick={() => togglePasswordVisibility("current")}>
                        {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="sp-field">
                    <label className="sp-field-label">New Password</label>
                    <span className="sp-field-hint">Min 8 characters, 1 uppercase, 1 number.</span>
                    <div className="sp-password-wrap">
                      <input className="sp-input" type={showPassword.newPass ? "text" : "password"} placeholder="New password" />
                      <button className="sp-password-toggle" onClick={() => togglePasswordVisibility("newPass")}>
                        {showPassword.newPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className="sp-strength-bar">
                      <div className="sp-strength-fill" style={{ width: "60%" }} />
                    </div>
                    <span className="sp-strength-label">Medium</span>
                  </div>
                  <div className="sp-field">
                    <label className="sp-field-label">Confirm New Password</label>
                    <span className="sp-field-hint">Re-enter your new password to confirm.</span>
                    <div className="sp-password-wrap">
                      <input className="sp-input" type={showPassword.confirm ? "text" : "password"} placeholder="Confirm new password" />
                      <button className="sp-password-toggle" onClick={() => togglePasswordVisibility("confirm")}>
                        {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button className="sp-btn sp-btn--green sp-btn--full">Change Password</button>
                </div>
              </div>
            </section>
          )}

          {/* ════════════════════════════════════════════
              PAGE 5: CONNECTED APPS
          ════════════════════════════════════════════ */}
          {activePage === "connected" && (
            <section className="sp-section">
              <h1 className="sp-page-title">Connected Apps</h1>

              <h3 className="sp-section-title">Link Your Streaming Accounts</h3>
              <div className="sp-conn-grid">
                {["Netflix", "Crunchyroll", "HiDive", "Funimation", "Prime Video"].map(name => (
                  <div key={name} className="sp-conn-card">
                    <div className="sp-conn-icon">
                      <Film size={24} />
                    </div>
                    <span className="sp-conn-name">{name}</span>
                    <span className="sp-conn-status sp-conn-status--off">Not Connected</span>
                    <button className="sp-btn sp-btn--green sp-btn--sm">Connect</button>
                  </div>
                ))}
              </div>

              <div className="sp-divider" />

              <h3 className="sp-section-title">Anime List Sync</h3>
              <div className="sp-conn-list">
                {[
                  { name: "MyAnimeList (MAL)", desc: "Import/export your MAL list" },
                  { name: "AniList", desc: "Sync with AniList account" },
                  { name: "Kitsu", desc: "Keep lists in sync" },
                ].map(svc => (
                  <div key={svc.name} className="sp-conn-list-item">
                    <div className="sp-conn-list-info">
                      <span className="sp-conn-name">{svc.name}</span>
                      <span className="sp-conn-desc">{svc.desc}</span>
                    </div>
                    <button className="sp-btn sp-btn--green">Connect</button>
                  </div>
                ))}
              </div>

              <div className="sp-divider" />

              <h3 className="sp-section-title">Social Media</h3>
              <div className="sp-conn-list">
                {["Discord", "Twitter / X"].map(sm => (
                  <div key={sm} className="sp-conn-list-item">
                    <div className="sp-conn-list-info">
                      <span className="sp-conn-name">{sm}</span>
                      <span className="sp-conn-desc">Connect your {sm} account.</span>
                    </div>
                    <button className="sp-btn sp-btn--green">Connect</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ════════════════════════════════════════════
              PAGE 6: DATA & PRIVACY
          ════════════════════════════════════════════ */}
          {activePage === "data" && (
            <section className="sp-section">
              <h1 className="sp-page-title">Data & Privacy</h1>

              <h3 className="sp-section-title">Export Your Data</h3>
              <p className="sp-section-desc">Download your personal data in various formats.</p>
              <div className="sp-card">
                <div className="sp-card-row">
                  <div className="sp-export-info">
                    <span className="sp-export-info-title">Download My Data (GDPR)</span>
                    <span className="sp-export-info-desc">Get a copy of all your data. Ready in 24 hours.</span>
                  </div>
                  <button className="sp-btn sp-btn--primary">Request Download</button>
                </div>
              </div>

              <div className="sp-divider" />

              <h3 className="sp-section-title">Export Watchlist</h3>
              <div className="sp-export-grid">
                {[
                  { title: "JSON (Re:ANIME)", desc: "Native format with full profile data.", icon: FileText },
                  { title: "XML (MyAnimeList)", desc: "Standard schema for tracker compatibility.", icon: FileText },
                  { title: "Plain Text", desc: "Simple list format (legacy Re:ANIME).", icon: FileText },
                ].map((opt, i) => (
                  <div key={i} className="sp-export-card">
                    <div className="sp-export-card-icon"><opt.icon size={24} /></div>
                    <span className="sp-export-card-title">{opt.title}</span>
                    <span className="sp-export-card-desc">{opt.desc}</span>
                    <div className="sp-export-card-actions">
                      <button className="sp-btn sp-btn--dark sp-btn--sm">Export</button>
                      <button className="sp-btn sp-btn--dark sp-btn--sm">Import</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="sp-divider" />

              {/* Delete Account */}
              <div className="sp-danger-card">
                <div className="sp-danger-card-inner">
                  <h4 className="sp-danger-title">Delete Account</h4>
                  <p className="sp-danger-desc">Permanently delete your account and all associated data. This action cannot be undone.</p>
                  <button className="sp-btn sp-btn--danger-outline" onClick={() => setShowDeleteModal(true)}>
                    <Trash2 size={16} /> Delete Account
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ════════════════════════════════════════════
              PAGE 7: BILLING
          ════════════════════════════════════════════ */}
          {activePage === "billing" && (
            <section className="sp-section">
              <h1 className="sp-page-title">Billing</h1>

              <h3 className="sp-section-title">Current Plan</h3>
              <div className="sp-plan-card">
                <div className="sp-plan-header">
                  <span className="sp-plan-name">Premium</span>
                  <span className="sp-plan-price">$9.99/month</span>
                </div>
                <ul className="sp-plan-features">
                  <li><CheckCircle size={16} /> Ad-free</li>
                  <li><CheckCircle size={16} /> 4K streaming</li>
                  <li><CheckCircle size={16} /> Offline downloads</li>
                </ul>
                <span className="sp-plan-renewal">Next billing: June 24, 2026</span>
                <div className="sp-plan-actions">
                  <button className="sp-btn sp-btn--primary">Change Plan</button>
                  <button className="sp-btn sp-btn--danger-outline">Cancel Subscription</button>
                </div>
              </div>

              <div className="sp-divider" />

              <h3 className="sp-section-title">Payment Methods</h3>
              <div className="sp-payment-card">
                <div className="sp-payment-info">
                  <CreditCard size={24} />
                  <div className="sp-payment-detail">
                    <span className="sp-payment-name">Visa ••••5678</span>
                    <span className="sp-payment-expiry">Expires 12/26</span>
                  </div>
                </div>
                <div className="sp-payment-actions">
                  <button className="sp-btn sp-btn--dark sp-btn--sm">Set as primary</button>
                  <button className="sp-btn sp-btn--danger-outline sp-btn--sm">Remove</button>
                </div>
              </div>
              <button className="sp-btn sp-btn--green mt-1">Add Payment Method</button>

              <div className="sp-divider" />

              <h3 className="sp-section-title">Billing History</h3>
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { date: "May 24, 2026", desc: "Premium subscription", amount: "$9.99", status: "Paid" },
                      { date: "Apr 24, 2026", desc: "Premium subscription", amount: "$9.99", status: "Paid" },
                      { date: "Mar 24, 2026", desc: "Premium subscription", amount: "$9.99", status: "Paid" },
                    ].map((b, i) => (
                      <tr key={i}>
                        <td>{b.date}</td>
                        <td>{b.desc}</td>
                        <td>{b.amount}</td>
                        <td><span className="sp-badge sp-badge--green">{b.status}</span></td>
                        <td><button className="sp-btn sp-btn--dark sp-btn--sm">Download Invoice</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ════════════════════════════════════════════
              PAGE 8: HELP & SUPPORT
          ════════════════════════════════════════════ */}
          {activePage === "help" && (
            <section className="sp-section">
              <h1 className="sp-page-title">Help & Support</h1>

              <h3 className="sp-section-title">FAQ</h3>
              <div className="sp-search-field">
                <Search size={16} />
                <input className="sp-input sp-input--search" placeholder="Search FAQs..." value={faqSearch} onChange={e => setFaqSearch(e.target.value)} />
              </div>
              <div className="sp-faq-list">
                {[
                  { q: "How do I change my password?", a: "Go to Privacy & Security in Settings, scroll to Change Password, enter your current and new password, then click Save." },
                  { q: "How do I export my watchlist?", a: "Go to Data & Privacy in Settings, find Export Watchlist, select your preferred format (JSON, XML, or Plain Text), and click Export." },
                  { q: "How do I enable 2FA?", a: "Go to Privacy & Security in Settings, find Two-Factor Authentication, click Enable, scan the QR code with your authenticator app, and save your backup codes." },
                  { q: "How do I delete my account?", a: "Go to Data & Privacy in Settings, scroll to Delete Account, click the button, confirm your decision, and your account will be scheduled for deletion after 30 days." },
                ].map((faq, i) => (
                  <div key={i} className="sp-faq-item">
                    <button className="sp-faq-question" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                      <span>{faq.q}</span>
                      {faqOpen === i ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {faqOpen === i && <div className="sp-faq-answer">{faq.a}</div>}
                  </div>
                ))}
              </div>

              <div className="sp-divider" />

              <h3 className="sp-section-title">Contact Support</h3>
              <div className="sp-form">
                <div className="sp-field">
                  <label className="sp-field-label">Subject</label>
                  <select className="sp-input sp-select">
                    <option>Account Issue</option>
                    <option>Technical Problem</option>
                    <option>Billing Question</option>
                    <option>Feature Request</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="sp-field">
                  <label className="sp-field-label">Message</label>
                  <textarea className="sp-textarea" rows={5} placeholder="Describe your issue in detail..." />
                </div>
                <button className="sp-btn sp-btn--green">Submit</button>
              </div>

              <div className="sp-divider" />

              <h3 className="sp-section-title">Quick Links</h3>
              <div className="sp-links-grid">
                {[
                  { label: "Report a Bug", icon: AlertTriangle },
                  { label: "Request a Feature", icon: Gift },
                  { label: "View Documentation", icon: FileText },
                  { label: "Community Forum", icon: MessageSquare },
                  { label: "Status Page", icon: Monitor },
                ].map((link, i) => {
                  const Icon = link.icon;
                  return (
                    <motion.button key={i} className="sp-link-card" variants={scaleIn} whileHover={{ y: -4, borderColor: "#8b5cf6" }}>
                      <Icon size={20} />
                      <span>{link.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </section>
          )}
        </motion.main>
      </div>

      {/* ─── Delete Confirmation Modal ─── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            className="sp-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteModal(false)}
          >
          <div className="sp-modal" onClick={e => e.stopPropagation()}>
            <div className="sp-modal-head">
              <h3>Delete Account</h3>
              <button className="sp-modal-close" onClick={() => setShowDeleteModal(false)}><X size={16} /></button>
            </div>
            <div className="sp-modal-body">
              <div className="sp-modal-icon"><AlertTriangle size={40} /></div>
              <p className="sp-modal-desc">This action cannot be undone. Your account will be permanently deleted after a 30-day cancellation period.</p>
              <div className="sp-field">
                <select className="sp-input sp-select">
                  <option value="">Select a reason (optional)</option>
                  <option>Not using the service enough</option>
                  <option>Too expensive</option>
                  <option>Privacy concerns</option>
                  <option>Found an alternative</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="sp-field">
                <label className="sp-checkbox-label">
                  <input type="checkbox" checked={deleteConfirm} onChange={e => setDeleteConfirm(e.target.checked)} />
                  <span>I understand this cannot be undone</span>
                </label>
              </div>
            </div>
            <div className="sp-modal-foot">
              <button className="sp-btn sp-btn--dark" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="sp-btn sp-btn--danger" disabled={!deleteConfirm}>Confirm Deletion</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </AnimatedPage>
  );
}
