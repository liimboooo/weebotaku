import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AnimatedPage from "../components/AnimatedPage";
import authService from "../services/authService";
import {
  User, Settings, RefreshCw, Shield, Eye, EyeOff, LogOut,
  Bell, SkipForward, SkipBack, Monitor, MessageSquare,
  Film, Volume2, Upload, Download, CheckCircle, X,
} from "lucide-react";
import "./SettingsPage.css";

const SIDEBAR_ITEMS = [
  { key: "account",     label: "Account",     icon: User },
  { key: "preferences", label: "Preferences", icon: Settings },
  { key: "sync",        label: "Sync",        icon: RefreshCw },
  { key: "security",    label: "Security",    icon: Shield },
];

const TOGGLE_SETTINGS_LEFT = [
  { id: "disableAds",           title: "Disable Ads",           desc: "Remove advertisements across the platform." },
  { id: "skipIntro",            title: "Skip intro automatically", desc: "Automatically skip anime intro sequences." },
  { id: "autoNext",             title: "Auto next episode",     desc: "Automatically play the next episode." },
  { id: "browserNotifs",        title: "Browser Notifications", desc: "Receive browser push notifications." },
];

const TOGGLE_SETTINGS_RIGHT = [
  { id: "defaultDubbed",        title: "Default to Dubbed",     desc: "Prefer dubbed audio when available." },
  { id: "skipOutro",            title: "Skip outro automatically", desc: "Automatically skip anime outro sequences." },
  { id: "autoPlay",             title: "Auto play",             desc: "Auto-play video when loading a page." },
  { id: "showComments",         title: "Show comments",         desc: "Display comments section on anime pages." },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const [activePage, setActivePage] = useState("account");
  const [showPassword, setShowPassword] = useState({ current: false, newPass: false, confirm: false });
  const [toggles, setToggles] = useState({
    disableAds: false, skipIntro: false, autoNext: false, browserNotifs: false,
    defaultDubbed: false, skipOutro: false, autoPlay: true, showComments: true,
  });
  const [syncConnected, setSyncConnected] = useState(false);
  const [bio, setBio] = useState("");

  const username = currentUser?.username || "formula09";
  const handle = `@${username}`;
  const avatar = currentUser?.avatar || "";
  const initial = username.charAt(0).toUpperCase();
  const joinDate = currentUser?.memberSince
    ? new Date(currentUser.memberSince).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Jan 1, 1970";

  const toggleSwitch = (id) => {
    setToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate("/");
  };

  return (
    <div className="sp">
      <div className="sp-layout">
        {/* ─── Sidebar ─── */}
        <aside className="sp-sidebar">
          <div className="sp-sidebar-title">SETTINGS</div>
          <nav className="sp-sidebar-nav">
            {SIDEBAR_ITEMS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`sp-sidebar-item ${activePage === key ? "active" : ""}`}
                onClick={() => setActivePage(key)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ─── Main Content ─── */}
        <main className="sp-content">
          {activePage === "account" && (
            <section className="sp-section">
              <h1 className="sp-page-title">Account</h1>

              <div className="sp-user-card">
                <div className="sp-user-card-left">
                  <div className="sp-user-avatar">
                    {avatar ? (
                      <img src={avatar} alt={username} />
                    ) : (
                      <span>{initial}</span>
                    )}
                  </div>
                  <div className="sp-user-info">
                    <span className="sp-user-label">Synced To Cloud</span>
                    <span className="sp-user-name">{username}</span>
                    <span className="sp-user-joined">Joined {joinDate} · 1 second ago</span>
                  </div>
                </div>
                <button className="sp-signout-btn" onClick={handleLogout}>
                  <LogOut size={16} /> Sign Out
                </button>
              </div>

              <div className="sp-form">
                <div className="sp-field">
                  <label className="sp-field-label">Username</label>
                  <span className="sp-field-hint">3-10 characters, letters and numbers only.</span>
                  <input className="sp-input" value={username} placeholder="Enter username" readOnly />
                </div>

                <div className="sp-field">
                  <label className="sp-field-label">Display Name</label>
                  <span className="sp-field-hint">How others see your name.</span>
                  <input className="sp-input" defaultValue={username} placeholder="Enter display name" />
                </div>

                <div className="sp-field">
                  <label className="sp-field-label">Bio</label>
                  <span className="sp-field-hint">Tell others a bit about you.</span>
                  <textarea
                    className="sp-textarea"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Write something about yourself..."
                    maxLength={500}
                  />
                  <span className="sp-char-count">{bio.length}/500</span>
                </div>

                <div className="sp-field">
                  <label className="sp-field-label">Website</label>
                  <span className="sp-field-hint">Your personal or social website.</span>
                  <input className="sp-input" placeholder="https://yoursite.com" />
                </div>
              </div>
            </section>
          )}

          {activePage === "preferences" && (
            <section className="sp-section">
              <h1 className="sp-page-title">Preferences</h1>

              <div className="sp-toggles-grid">
                <div className="sp-toggles-col">
                  {TOGGLE_SETTINGS_LEFT.map(item => (
                    <div key={item.id} className="sp-toggle-row">
                      <div className="sp-toggle-info">
                        <span className="sp-toggle-title">{item.title}</span>
                        <span className="sp-toggle-desc">{item.desc}</span>
                      </div>
                      <button
                        className={`sp-toggle ${toggles[item.id] ? "active" : ""}`}
                        onClick={() => toggleSwitch(item.id)}
                        aria-label={item.title}
                      >
                        <span className="sp-toggle-knob" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="sp-toggles-col">
                  {TOGGLE_SETTINGS_RIGHT.map(item => (
                    <div key={item.id} className="sp-toggle-row">
                      <div className="sp-toggle-info">
                        <span className="sp-toggle-title">{item.title}</span>
                        <span className="sp-toggle-desc">{item.desc}</span>
                      </div>
                      <button
                        className={`sp-toggle ${toggles[item.id] ? "active" : ""}`}
                        onClick={() => toggleSwitch(item.id)}
                        aria-label={item.title}
                      >
                        <span className="sp-toggle-knob" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sp-divider" />

              <div className="sp-section-footer">
                <span className="sp-section-footer-title">Additional Preferences</span>
                <p className="sp-section-footer-desc">
                  More options will be available in future updates.
                </p>
              </div>
            </section>
          )}

          {activePage === "sync" && (
            <section className="sp-section">
              <h1 className="sp-page-title">Sync</h1>

              <div className="sp-sync-card">
                <div className="sp-sync-card-left">
                  <div className="sp-sync-icon">
                    <RefreshCw size={24} />
                  </div>
                  <div className="sp-sync-info">
                    <span className="sp-sync-name">AniList Sync</span>
                    <span className="sp-sync-status">{syncConnected ? "Connected" : "Not Connected"}</span>
                  </div>
                </div>
                <button
                  className={`sp-connect-btn ${syncConnected ? "connected" : ""}`}
                  onClick={() => setSyncConnected(!syncConnected)}
                >
                  {syncConnected ? "Disconnect" : "Connect"}
                </button>
              </div>

              <div className="sp-about-sync">
                <h3 className="sp-subheading">About Sync</h3>
                <p className="sp-about-text">
                  Sync your watch progress with AniList to keep your lists up to date across devices.
                  Your watch history, ratings, and watchlist will be synchronized automatically.
                </p>
                <ul className="sp-features-list">
                  <li><CheckCircle size={16} /> Automatic progress tracking</li>
                  <li><CheckCircle size={16} /> Manual sync anytime</li>
                </ul>
              </div>

              <div className="sp-divider" />

              <div className="sp-data-mgmt">
                <h3 className="sp-subheading">Data Management</h3>
                <p className="sp-about-text">
                  Export your watchlist for backup or migrate to another service.
                </p>
                <div className="sp-export-grid">
                  <div className="sp-export-card">
                    <div className="sp-export-icon">
                      <Upload size={24} />
                    </div>
                    <span className="sp-export-title">JSON (Re:ANIME)</span>
                    <span className="sp-export-desc">Native format with full profile data.</span>
                    <div className="sp-export-actions">
                      <button className="sp-export-btn">Export</button>
                      <button className="sp-export-btn">Import</button>
                    </div>
                  </div>
                  <div className="sp-export-card">
                    <div className="sp-export-icon">
                      <Download size={24} />
                    </div>
                    <span className="sp-export-title">CSV</span>
                    <span className="sp-export-desc">Spreadsheet-compatible format.</span>
                    <div className="sp-export-actions">
                      <button className="sp-export-btn">Export</button>
                      <button className="sp-export-btn">Import</button>
                    </div>
                  </div>
                  <div className="sp-export-card">
                    <div className="sp-export-icon">
                      <Film size={24} />
                    </div>
                    <span className="sp-export-title">MAL XML</span>
                    <span className="sp-export-desc">MyAnimeList compatible backup.</span>
                    <div className="sp-export-actions">
                      <button className="sp-export-btn">Export</button>
                      <button className="sp-export-btn">Import</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activePage === "security" && (
            <section className="sp-section">
              <h1 className="sp-page-title">Security</h1>

              <div className="sp-form">
                <div className="sp-field">
                  <label className="sp-field-label">Current Password</label>
                  <span className="sp-field-hint">Enter your existing password to verify your identity.</span>
                  <div className="sp-password-wrap">
                    <input
                      className="sp-input"
                      type={showPassword.current ? "text" : "password"}
                      placeholder="Current password"
                    />
                    <button
                      className="sp-password-toggle"
                      onClick={() => togglePasswordVisibility("current")}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="sp-field">
                  <label className="sp-field-label">New Password</label>
                  <span className="sp-field-hint">Must be at least 8 characters long.</span>
                  <div className="sp-password-wrap">
                    <input
                      className="sp-input"
                      type={showPassword.newPass ? "text" : "password"}
                      placeholder="New password"
                    />
                    <button
                      className="sp-password-toggle"
                      onClick={() => togglePasswordVisibility("newPass")}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword.newPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="sp-field">
                  <label className="sp-field-label">Confirm New Password</label>
                  <span className="sp-field-hint">Re-enter your new password to confirm.</span>
                  <div className="sp-password-wrap">
                    <input
                      className="sp-input"
                      type={showPassword.confirm ? "text" : "password"}
                      placeholder="Confirm new password"
                    />
                    <button
                      className="sp-password-toggle"
                      onClick={() => togglePasswordVisibility("confirm")}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button className="sp-change-btn">Change Password</button>
              </div>

              <div className="sp-divider" />

              <div className="sp-section-footer">
                <span className="sp-section-footer-title">Additional Security</span>
                <div className="sp-security-options">
                  <div className="sp-security-option">
                    <div className="sp-security-option-info">
                      <span className="sp-security-option-title">Two-Factor Authentication</span>
                      <span className="sp-security-option-desc">Add an extra layer of security to your account.</span>
                    </div>
                    <span className="sp-coming-soon">Coming Soon</span>
                  </div>
                  <div className="sp-security-option">
                    <div className="sp-security-option-info">
                      <span className="sp-security-option-title">Active Sessions</span>
                      <span className="sp-security-option-desc">Manage your active login sessions.</span>
                    </div>
                    <span className="sp-coming-soon">Coming Soon</span>
                  </div>
                  <div className="sp-security-option">
                    <div className="sp-security-option-info">
                      <span className="sp-security-option-title">Login History</span>
                      <span className="sp-security-option-desc">Review recent login attempts to your account.</span>
                    </div>
                    <span className="sp-coming-soon">Coming Soon</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
