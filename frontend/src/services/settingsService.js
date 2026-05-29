import api from "./api";

const SETTINGS_KEY = "animewch_settings";
const SYNC_KEY = "animewch_sync";

const DEFAULTS = {
  darkMode: "auto", fontSize: "Medium", accentColor: "#ffffff",
  autoNext: true, skipIntro: false, skipOutro: false, showSubtitles: true,
  disableAds: false, showComments: true, hideNsfw: true, showMatureWarnings: true,
  showEpisodeProgress: true, showRatingsCards: true,
  emailNotifs: true, newEpisodes: true, communityActivity: false,
  friendsActivity: false, systemUpdates: true, weeklyRecs: true,
  pushNotifs: true, newsNotifications: true, newEpisodeAlerts: true,
  commentReplies: true, friendRequests: true,
  animeRecs: false, newFeatures: false,
  publicProfile: true, showWatchlistPublic: true,
  allowMessaging: "anyone", showActivityStatus: true, showLastActive: false,
  defaultDubbed: "subbed", contentRating: "PG-13", defaultListView: "Grid",
  malConnected: false, aniConnected: false,
  playbackSpeed: 1,
};

const settingsService = {
  async load() {
    try {
      const data = await api.get("/auth/settings");
      if (data?.success && data?.settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
        return { ...DEFAULTS, ...data.settings };
      }
    } catch {}
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        return { ...DEFAULTS, ...saved };
      }
    } catch {}
    return { ...DEFAULTS };
  },

  async save(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('settings-changed'));
    try {
      await api.put("/auth/settings", settings);
    } catch (e) {
      console.warn("settingsService: failed to sync settings to server", e);
    }
  },

  async fetchFromServer() {
    try {
      const data = await api.get("/auth/settings");
      if (data?.success && data?.settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
        return { ...DEFAULTS, ...data.settings };
      }
    } catch {}
    return null;
  },

  loadSync() {
    try {
      const raw = localStorage.getItem(SYNC_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { malLastSync: null, aniLastSync: null };
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
    const data = await api.post("/auth/sync/mal/sync");
    const sync = this.loadSync();
    sync.malLastSync = data.lastSync || new Date().toISOString();
    this.saveSync(sync);
    return { success: true, lastSync: sync.malLastSync, imported: data.imported || 0, total: data.total || 0 };
  },

  async syncWithAniList() {
    const data = await api.post("/auth/sync/anilist/sync");
    const sync = this.loadSync();
    sync.aniLastSync = data.lastSync || new Date().toISOString();
    this.saveSync(sync);
    return { success: true, lastSync: sync.aniLastSync, imported: data.imported || 0, total: data.total || 0 };
  },

  async connectMAL(username) {
    const data = await api.post("/auth/sync/mal/connect", { username });
    return data;
  },

  async disconnectMAL() {
    const data = await api.post("/auth/sync/mal/disconnect");
    return data;
  },

  async connectAniList(username) {
    const data = await api.post("/auth/sync/anilist/connect", { username });
    return data;
  },

  async disconnectAniList() {
    const data = await api.post("/auth/sync/anilist/disconnect");
    return data;
  },

  async changePassword(currentPassword, newPassword) {
    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    try {
      const data = await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, errors: [e.message] };
    }
  },

  async deleteAccount() {
    await api.delete("/auth/account");
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith("animewch_") || k === "token" || k === "user" || k === "isLoggedIn") {
        localStorage.removeItem(k);
      }
    });
    return { success: true };
  },

  async get2FAStatus() {
    try {
      const data = await api.get("/auth/2fa/status");
      return data;
    } catch {
      return { enabled: false, hasSecret: false, backupCodeCount: 0 };
    }
  },

  async setup2FA() {
    const data = await api.post("/auth/2fa/setup");
    return data;
  },

  async verify2FASetup(code) {
    const data = await api.post("/auth/2fa/verify-setup", { code });
    return data;
  },

  async disable2FA(password) {
    const data = await api.post("/auth/2fa/disable", { password });
    return data;
  },

  async requestEmailVerify() {
    return api.post("/auth/email/request-verify");
  },
};

export default settingsService;