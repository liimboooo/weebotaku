const SETTINGS_KEY = "animewch_settings";
const SYNC_KEY = "animewch_sync";

const DEFAULTS = {
  darkMode: "auto", fontSize: "Medium", accentColor: "#667eea",
  autoNext: true, skipIntro: false, skipOutro: false, showSubtitles: true,
  disableAds: false, showComments: true, hideNsfw: true, showMatureWarnings: true,
  showEpisodeProgress: true, showRatingsCards: true,
  emailNotifs: true, newEpisodes: true, communityActivity: false,
  friendsActivity: false, systemUpdates: true, weeklyRecs: true,
  pushNotifs: true, newEpisodeAlerts: true, dms: false,
  commentReplies: true, friendRequests: true, achievements: true,
  newsletterSub: false, animeRecs: false, newFeatures: false,
  notifFreq: "Weekly",
  dndMode: false, dndFrom: "22:00", dndTo: "08:00",
  publicProfile: true, showWatchlistPublic: true,
  allowMessaging: "anyone", showActivityStatus: true, showLastActive: false,
  defaultDubbed: "subbed", contentRating: "PG-13", defaultListView: "Grid",
  malConnected: false, aniConnected: false,
  autoSyncEpisode: true, autoSyncInterval: false, autoSyncStartup: true, autoSyncShutdown: false,
  playbackSpeed: 1,
};

const settingsService = {
  load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        return { ...DEFAULTS, ...saved };
      }
    } catch {}
    return { ...DEFAULTS };
  },

  save(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  loadSync() {
    try {
      const raw = localStorage.getItem(SYNC_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { malLastSync: null, aniLastSync: null, malData: null, aniData: null };
  },

  saveSync(syncData) {
    localStorage.setItem(SYNC_KEY, JSON.stringify(syncData));
  },

  loadUserProfile() {
    try {
      const stored = localStorage.getItem("animewch_profile");
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  },

  saveUserProfile(profile) {
    localStorage.setItem("animewch_profile", JSON.stringify(profile));
  },

  validatePassword(password) {
    const errors = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
    if (!/[0-9]/.test(password)) errors.push("One number");
    return { valid: errors.length === 0, errors };
  },

  getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { label: "Weak", color: "#ff6b6b", width: "25%" };
    if (score <= 2) return { label: "Fair", color: "#fbbf24", width: "50%" };
    if (score <= 4) return { label: "Good", color: "#4ade80", width: "75%" };
    return { label: "Strong", color: "#22c55e", width: "100%" };
  },

  async syncWithMAL() {
    return new Promise(resolve => {
      setTimeout(() => {
        const sync = settingsService.loadSync();
        sync.malLastSync = new Date().toLocaleTimeString();
        sync.malData = {
          anime: ["Attack on Titan", "Jujutsu Kaisen", "One Piece"],
          lastUpdated: Date.now(),
        };
        settingsService.saveSync(sync);
        resolve({ success: true, lastSync: sync.malLastSync });
      }, 2000);
    });
  },

  async syncWithAniList() {
    return new Promise(resolve => {
      setTimeout(() => {
        const sync = settingsService.loadSync();
        sync.aniLastSync = new Date().toLocaleTimeString();
        sync.aniData = {
          anime: ["Chainsaw Man", "Demon Slayer", "Solo Leveling"],
          lastUpdated: Date.now(),
        };
        settingsService.saveSync(sync);
        resolve({ success: true, lastSync: sync.aniLastSync });
      }, 2000);
    });
  },

  async changePassword(currentPassword, newPassword) {
    const validation = settingsService.validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    return new Promise(resolve => {
      setTimeout(() => {
        localStorage.setItem("animewch_password_hash", btoa(newPassword));
        resolve({ success: true });
      }, 800);
    });
  },

  async deleteAccount() {
    return new Promise(resolve => {
      setTimeout(() => {
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
          if (k.startsWith("animewch_") || k === "token" || k === "user" || k === "isLoggedIn") {
            localStorage.removeItem(k);
          }
        });
        resolve({ success: true });
      }, 1500);
    });
  },

  toggle2FA(enabled) {
    localStorage.setItem("animewch_2fa", enabled ? "true" : "false");
  },

  get2FAStatus() {
    return localStorage.getItem("animewch_2fa") === "true";
  },
};

export default settingsService;
