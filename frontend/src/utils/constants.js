/**
 * Shared constants for the otaku app.
 *
 * All status mappings, filter options, storage keys, and other
 * hardcoded values that appear in more than one place are defined here
 * so they can be changed in a single location.
 */

// ─── Anime status: AniList API key → display label ───────────────
export const ANIME_STATUS_LABELS = {
  RELEASING: "Ongoing",
  FINISHED: "Completed",
  NOT_YET_RELEASED: "Upcoming",
  CANCELLED: "Cancelled",
  HIATUS: "Hiatus",
};

/** Convert an AniList status string to a human-readable label. */
export function statusLabel(s) {
  return ANIME_STATUS_LABELS[s] || s || "Unknown";
}

// ─── Reverse mapping: display label → AniList API key ────────────
export const STATUS_MAP = {
  Ongoing: "RELEASING",
  Completed: "FINISHED",
  Upcoming: "NOT_YET_RELEASED",
};

// ─── Anime format: AniList API key → display label ───────────────
export const ANIME_FORMAT_LABELS = {
  TV: "TV",
  MOVIE: "Movie",
  OVA: "OVA",
  ONA: "ONA",
  SPECIAL: "Special",
  MUSIC: "Music",
};

// ─── Filter / sort options ───────────────────────────────────────
export const SORT_OPTIONS = [
  { value: "popularity", label: "Popularity" },
  { value: "score", label: "Score" },
  { value: "recent", label: "Recently Added" },
];

export const FORMAT_OPTIONS = ["TV", "Movie", "OVA"];

export const FORMAT_MAP = { TV: "TV", MOVIE: "Movie", OVA: "OVA", ONA: "ONA", SPECIAL: "Special" };

/** Browse page status buckets. */
export const STATUS_BUCKET_OPTIONS = [
  { value: "Airing", label: "Airing" },
  { value: "Finished", label: "Finished" },
];

/** Watchlist / list status options. */
export const LIST_OPTIONS = ["Planning", "Watching", "Completed", "Paused", "Dropped"];

/** Search page status filter. */
export const SEARCH_STATUSES = ["All", "Ongoing", "Completed"];

// ─── Storage keys ─────────────────────────────────────────────────
export const STORAGE_KEYS = {
  TOKEN: "token",
  USER: "user",
  USERNAME: "username",
  IS_LOGGED_IN: "isLoggedIn",
  USER_AVATAR: "userAvatar",
  MEMBER_SINCE: "memberSince",
  SOCIAL_LINKS: "socialLinks",
  WATCHLIST: "watchlist",
  ANIME_WATCHLIST: "animewatchlist",
  WATCH_HISTORY: "watchHistory",
  USER_RATINGS: "userRatings",
  LIKED_ANIME: "likedAnime",
  RECENT_SEARCHES: "recentSearches",
  RATINGS: "ratings",
  PREVIOUS_USER: "previousUser",
  BADGES: "badges",
  BADGE_HISTORY: "badgeHistory",
  BADGE_DEFS: "badgeDefs",
  NOTIFICATIONS: "otaku_notifications",
  LOCALE: "otaku_locale",
  WATCHLIST_UPDATED: "watchlist-updated",
  PROFILE_DATA_CHANGED: "profile-data-changed",
  PROFILE_AVATAR_UPDATED: "profile-avatar-updated",
  AMV_EDITS: "amv_edits",
  AMV_LIKED: "amv_liked",
  AMV_SAVED: "amv_saved",
  AMV_VIEWED: "amv_viewed",
};
// ─── Cache / constants ───────────────────────────────────────────
export const LS_CACHE_PREFIX = "al_";

// ─── Genre fallback (when AniList API is unreachable) ────────────
export const FALLBACK_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Horror", "Mystery", "Romance", "Sci-Fi",
  "Slice of Life", "Sports", "Thriller",
];

// ─── UI defaults ─────────────────────────────────────────────────
export const COMMENTS_SORT_OPTIONS = [
  { key: "newest", label: "Most recent" },
  { key: "top", label: "Top" },
  { key: "liked", label: "Most Liked" },
];
export const COMMENTS_INITIAL_VISIBLE = 5;
export const COMMENTS_LOAD_MORE_COUNT = 5;
export const COMMENTS_MAX_CHARS = 500;
export const AVATAR_COLORS = [
  "#6366f1", "#ef4444", "#10b981", "#f59e0b",
  "#3b82f6", "#ec4899", "#14b8a6", "#8b5cf6",
];

export const MAX_FAVORITES = 5;
export const MAX_ACTIVITIES = 50;
export const MAX_COLLECTIONS = 20;

export const DEFAULT_RETRIES = 2;
export const RETRY_DELAY_MS = 1000;
export const FETCH_TIMEOUT = 30000;
export const SYNC_INTERVAL_MS = 2 * 60 * 1000;
export const PING_INTERVAL_MS = 4 * 60 * 1000;
export const TOAST_DURATION_MS = 3000;
export const TOAST_DURATION_LONG_MS = 4000;

export const FAST_SEARCH_DEBOUNCE_MS = 250;
export const FAST_SEARCH_MAX_ANIME = 6;
export const FAST_SEARCH_MAX_USERS = 4;




