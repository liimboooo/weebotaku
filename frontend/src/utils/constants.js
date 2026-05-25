/**
 * Shared constants for the animewch app.
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

/** MangaVault page statuses. */
export const MANGA_STATUSES = ["Ongoing", "Completed", "Hiatus"];

/** Manga demographics. */
export const MANGA_DEMOGRAPHICS = ["Shonen", "Seinen", "Shojo", "Josei"];

/** Watchlist / list status options. */
export const LIST_OPTIONS = ["Watch Later", "Watching", "Completed", "On Hold", "Dropped"];

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
  MANGA_READ_LIST: "mangareadlist",
  WATCH_HISTORY: "watchHistory",
  MANGA_PROGRESS: "mangaProgress",
  USER_RATINGS: "userRatings",
  LIKED_ANIME: "likedAnime",
  RECENT_SEARCHES: "recentSearches",
  RATINGS: "ratings",
  PREVIOUS_USER: "previousUser",
  USER_PROGRESSION: "userProgression",
  BADGES: "badges",
  BADGE_HISTORY: "badgeHistory",
  BADGE_DEFS: "badgeDefs",
  NOTIFICATIONS: "animewch_notifications",
  LOCALE: "animewch_locale",
  WATCHLIST_UPDATED: "watchlist-updated",
  PROGRESSION_UPDATED: "progression-updated",
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
  "#7c3aed", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6",
];

export const FAST_SEARCH_DEBOUNCE_MS = 250;
export const FAST_SEARCH_MAX_ANIME = 6;
export const FAST_SEARCH_MAX_USERS = 4;




