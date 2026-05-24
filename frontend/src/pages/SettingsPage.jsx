import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import authService from "../services/authService";
import AnimatedPage from "../components/AnimatedPage";
import {
  User, Settings, Bell, Shield,
  Eye, EyeOff, LogOut, Sun, Moon, Monitor,
  CheckCircle, X, Trash2,
  AlertTriangle, QrCode, Copy,
} from "lucide-react";
import "./SettingsPage.css";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const fadeIn = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

const SIDEBAR_ITEMS = [
  { key: "account",       label: "Account",           icon: User },
  { key: "preferences",   label: "Preferences",       icon: Settings },
  { key: "notifications", label: "Notifications",     icon: Bell },
  { key: "privacy",       label: "Privacy & Security", icon: Shield },
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </AnimatedPage>
  );
}
