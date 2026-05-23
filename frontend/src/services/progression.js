import api from './api';
import { STORAGE_KEYS } from '../utils/constants';
import badgeService from './badgeService';

const XP_WATCH_EPISODE = 10;
const XP_RATE_ANIME = 5;
const XP_LIKE_ANIME = 2;
const XP_WATCHLIST_ADD = 3;
const XP_DAILY_BONUS = 20;

function isLoggedIn() {
  return !!localStorage.getItem(STORAGE_KEYS.TOKEN);
}

function getProgression() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_PROGRESSION) || "{}");
  } catch { return {}; }
}

function saveProgression(data) {
  localStorage.setItem(STORAGE_KEYS.USER_PROGRESSION, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(STORAGE_KEYS.PROGRESSION_UPDATED));
}

function syncToBackend(data) {
  if (isLoggedIn()) {
    api.post('/auth/sync-progression', data).catch(() => {});
  }
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return Math.floor((da - db) / 86400000);
}

export function addXP(amount, source = "") {
  const prog = getProgression();
  const xp = (prog.xp || 0) + amount;
  const today = getToday();
  const lastActive = prog.lastActiveDate || "";
  let streak = prog.currentStreak || 0;
  let longestStreak = prog.longestStreak || 0;

  if (lastActive !== today) {
    const diff = lastActive ? daysBetween(today, lastActive) : 999;
    if (diff === 1) {
      streak += 1;
    } else if (diff > 1) {
      streak = 1;
    } else {
      streak = 1;
    }
    longestStreak = Math.max(longestStreak, streak);
    prog.lastActiveDate = today;
  }

  const oldLevel = getLevel(prog.xp || 0);
  const newLevel = getLevel(xp);

  prog.xp = xp;
  prog.currentStreak = streak;
  prog.longestStreak = longestStreak;
  prog.lastActiveDate = today;
  saveProgression(prog);
  syncToBackend(prog);

  if (newLevel > oldLevel) {
    window.dispatchEvent(new CustomEvent("level-up", { detail: { level: newLevel } }));
  }

  return { xp, level: newLevel, streak, longestStreak, levelUp: newLevel > oldLevel };
}

export function getLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function getLevelProgress(xp) {
  const level = getLevel(xp);
  const currentLevelXP = 100 * (level - 1) ** 2;
  const nextLevelXP = 100 * level ** 2;
  const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  return Math.min(progress, 100);
}

export function getCurrentXP() {
  const prog = getProgression();
  return prog.xp || 0;
}

export function getCurrentLevel() {
  return getLevel(getCurrentXP());
}

export function getStreak() {
  const prog = getProgression();
  return {
    current: prog.currentStreak || 0,
    longest: prog.longestStreak || 0,
    lastActiveDate: prog.lastActiveDate || "",
  };
}

// @deprecated - kept as fallback; prefer fetching from API via getAllBadgeDefs()
const BADGE_DEFS = {
  Collector: { label: "Collector", desc: "10 anime in watchlist", icon: "Library", check: (stats) => stats.watchlistCount >= 10 },
  "Hardcore Fan": { label: "Hardcore Fan", desc: "50 episodes watched", icon: "Flame", check: (stats) => stats.episodesWatched >= 50 },
  "On Fire": { label: "On Fire", desc: "7-day streak", icon: "Zap", check: (stats) => (stats.streak || 0) >= 7 },
  Rater: { label: "Rater", desc: "10 anime rated", icon: "Star", check: (stats) => stats.ratingCount >= 10 },
  Critic: { label: "Critic", desc: "50 anime rated", icon: "MessageSquare", check: (stats) => stats.ratingCount >= 50 },
  Otaku: { label: "Otaku", desc: "Level 10", icon: "Gamepad2", check: (stats) => (stats.level || 0) >= 10 },
  Legend: { label: "Legend", desc: "Level 25", icon: "Trophy", check: (stats) => (stats.level || 0) >= 25 },
  Dedicated: { label: "Dedicated", desc: "30-day streak", icon: "Gem", check: (stats) => (stats.streak || 0) >= 30 },
  Loyal: { label: "Loyal", desc: "100 episodes watched", icon: "Crown", check: (stats) => stats.episodesWatched >= 100 },
  Curator: { label: "Curator", desc: "25 anime in watchlist", icon: "FolderOpen", check: (stats) => stats.watchlistCount >= 25 },
};

let _badgeCache = null;
export async function getAllBadgeDefs() {
  if (_badgeCache) return _badgeCache;
  try {
    const res = await badgeService.getBadgeDefs();
    if (res.success) {
      _badgeCache = res.data;
      return res.data;
    }
  } catch {}
  return BADGE_DEFS;
}

export async function getBadges(stats = {}) {
  const defs = await getAllBadgeDefs();
  const prog = getProgression();
  const level = getLevel(prog.xp || 0);
  const streakData = getStreak();
  const earned = [];
  for (const [key, def] of Object.entries(defs)) {
    if (def.check({ ...stats, level, streak: streakData.current })) {
      earned.push({ key, ...def });
    }
  }
  return earned;
}

function notifyXP(amount, label) {
  window.dispatchEvent(new CustomEvent("xp-gain", { detail: { amount, label } }));
}

export function awardWatchEpisode() {
  const result = addXP(XP_WATCH_EPISODE, "watch");
  notifyXP(XP_WATCH_EPISODE, "Episode watched");
  return result;
}

export function awardRateAnime() {
  const result = addXP(XP_RATE_ANIME, "rate");
  notifyXP(XP_RATE_ANIME, "Anime rated");
  return result;
}

export function awardLikeAnime() {
  const result = addXP(XP_LIKE_ANIME, "like");
  notifyXP(XP_LIKE_ANIME, "Anime liked");
  return result;
}

export function awardWatchlistAdd() {
  const result = addXP(XP_WATCHLIST_ADD, "watchlist");
  notifyXP(XP_WATCHLIST_ADD, "Added to watchlist");
  return result;
}

export function awardDailyBonus() {
  const prog = getProgression();
  const today = getToday();
  const lastDaily = prog.lastDailyBonus || "";
  if (lastDaily === today) return null;
  prog.lastDailyBonus = today;
  saveProgression(prog);
  syncToBackend(prog);
  const result = addXP(XP_DAILY_BONUS, "daily");
  notifyXP(XP_DAILY_BONUS, "Daily bonus");
  return result;
}

