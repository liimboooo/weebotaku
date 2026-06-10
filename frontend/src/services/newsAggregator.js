import { fetchAnimeNews } from "./animeNewsApi";
import { addNotification } from "./notificationService";
import { formatTimeAgo } from "../utils/helpers";

const YOUTUBE_EMBED = process.env.REACT_APP_YOUTUBE_EMBED_BASE || "https://www.youtube.com/embed/";

const cache = new Map();
const CACHE_TTL = 3 * 60 * 1000;
const NOTIFIED_KEY = "otaku_notified_news";

function getNotified() {
  try { return JSON.parse(localStorage.getItem(NOTIFIED_KEY)) || {}; } catch { return {}; }
}
function markNotified(id) {
  const map = getNotified();
  map[id] = Date.now();
  try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map)); } catch {}
}
function wasNotified(id) {
  return !!getNotified()[id];
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) { cache.set(key, { data, time: Date.now() }); }


export async function fetchAggregatedNews() {
  const cached = getCached("aggregated");
  if (cached) {
    try {
      const s = JSON.parse(localStorage.getItem("otaku_settings"));
      if (!s || s.newsNotifications !== false) queueNotifications(cached);
    } catch { queueNotifications(cached); }
    return cached;
  }

  const anilist = await fetchAnimeNews().catch(() => null);

  const usedIds = new Set();

  const trailers = buildTrailers(anilist, usedIds);
  const trending = buildDedupedList(anilist?.animeTrending, usedIds);
  const airing = buildDedupedList(anilist?.animeAiring, usedIds);
  const popular = buildDedupedList(anilist?.animePopular, usedIds);

  const allNews = [...(anilist?.allNews || []), ...trailers];
  allNews.sort((a, b) => new Date(b.date) - new Date(a.date));

  const result = {
    allNews,
    trailers,
    featured: buildFeatured(trailers, trending, airing),
    trending,
    airing,
    popular,
    rails: buildRails(trailers, trending, airing),
  };

  try {
    const s = JSON.parse(localStorage.getItem("otaku_settings"));
    if (!s || s.newsNotifications !== false) queueNotifications(result);
  } catch { queueNotifications(result); }

  setCache("aggregated", result);
  return result;
}

function buildDedupedList(items, usedIds) {
  if (!items) return [];
  const out = [];
  for (const item of items) {
    if (usedIds.has(item.id)) continue;
    usedIds.add(item.id);
    out.push(item);
  }
  return out;
}

function queueNotifications(result) {
  for (const v of result.trailers || []) {
    if (wasNotified(v.id)) continue;
    markNotified(v.id);
    addNotification({ title: v.title || "New Trailer", body: v.description?.slice(0, 100) || "", type: "trailer", link: `/anime/${v.animeId}/info` });
  }
  for (const a of (result.trending || []).slice(0, 3)) {
    if (wasNotified(`trending-${a.id}`)) continue;
    markNotified(`trending-${a.id}`);
    addNotification({ title: `${a.title} is Trending`, body: `Score: ${a.score || "N/A"}${a.genres?.length ? " · " + a.genres.slice(0, 2).join(", ") : ""}`, type: "trending", link: `/anime/${a.id}/info` });
  }
  for (const a of (result.airing || []).slice(0, 3)) {
    if (wasNotified(`airing-${a.id}`)) continue;
    markNotified(`airing-${a.id}`);
    addNotification({ title: `${a.title} — New Episode`, body: `${a.nextEpisode?.ep ? "Ep " + a.nextEpisode.ep : "Now Airing"}${a.score ? " · " + a.score + "★" : ""}`, type: "episode", link: `/anime/${a.id}/info` });
  }
}

function buildTrailers(anilist, usedIds) {
  const items = [];
  const seen = new Set();
  const sources = [
    ...(anilist?.animeTrending || []),
    ...(anilist?.animeAiring || []),
    ...(anilist?.animePopular || []),
  ];
  for (const a of sources) {
    if (!a.trailer || seen.has(a.trailer)) continue;
    if (usedIds.has(a.id)) continue;
    usedIds.add(a.id);
    seen.add(a.trailer);
    items.push({
      id: `yt-${a.trailer}`,
      type: "trailer",
      source: "youtube",
      sourceLabel: a.studio || "YouTube",
      title: `${a.title} — Trailer`,
      description: a.synopsis?.slice(0, 200) || "",
      image: a.image,
      bannerImage: a.bannerImage,
      videoId: a.trailer,
      embedUrl: `${YOUTUBE_EMBED}${a.trailer}`,
      url: `https://youtube.com/watch?v=${a.trailer}`,
      date: new Date().toISOString(),
      animeId: a.id,
      genres: a.genres,
      score: a.score,
    });
  }
  return items;
}

function buildFeatured(trailers, trending, airing) {
  const items = [];
  for (const a of trending.slice(0, 3)) {
    items.push({ kind: "trending", ...a });
  }
  for (const v of trailers.slice(0, 2)) {
    items.push({ kind: "trailer", ...v });
  }
  for (const a of airing.slice(0, 2)) {
    items.push({ kind: "airing", ...a });
  }
  items.sort(() => Math.random() - 0.5);
  return items.slice(0, 5);
}

function buildRails(trailers, trending, airing) {
  const rails = [];
  if (trailers?.length) {
    rails.push({ id: "trailers", icon: "", label: "Latest Trailers", items: trailers.slice(0, 10) });
  }
  if (trending?.length) {
    rails.push({ id: "trending", icon: "", label: "Trending Now", items: trending.slice(0, 10).map(a => ({ ...a, kind: "anime" })) });
  }
  if (airing?.length) {
    rails.push({ id: "airing", icon: "", label: "Currently Airing", items: airing.slice(0, 10).map(a => ({ ...a, kind: "anime" })) });
  }
  return rails;
}

export function formatTimestamp(dateStr) {
  return formatTimeAgo(dateStr);
}

export function clearAggregatedCache() { cache.clear(); }
