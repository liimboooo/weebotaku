import { fetchAnimeNews } from "./animeNewsApi";

const YOUTUBE_EMBED = process.env.REACT_APP_YOUTUBE_EMBED_BASE || "https://www.youtube.com/embed/";

const cache = new Map();
const CACHE_TTL = 3 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) { cache.set(key, { data, time: Date.now() }); }

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export async function fetchAggregatedNews() {
  const cached = getCached("aggregated");
  if (cached) return cached;

  const anilist = await fetchAnimeNews().catch(() => null);

  const trailers = buildTrailers(anilist);
  const allNews = [...(anilist?.allNews || []), ...trailers];
  allNews.sort((a, b) => new Date(b.date) - new Date(a.date));

  const result = {
    allNews,
    trailers,
    featured: buildFeatured(anilist, trailers),
    trending: anilist?.animeTrending || [],
    airing: anilist?.animeAiring || [],
    popular: anilist?.animePopular || [],
    rails: buildRails(anilist, trailers),
  };

  setCache("aggregated", result);
  return result;
}

function buildTrailers(anilist) {
  const items = [];
  const seen = new Set();
  const sources = [
    ...(anilist?.animeTrending || []),
    ...(anilist?.animeAiring || []),
    ...(anilist?.animePopular || []),
  ];
  for (const a of sources) {
    if (!a.trailer || seen.has(a.trailer)) continue;
    seen.add(a.trailer);
    items.push({
      id: `yt-${a.trailer}`,
      type: "trailer",
      source: "youtube",
      sourceLabel: a.studio || "YouTube",
      title: `${a.title} — Trailer`,
      description: a.synopsis?.slice(0, 200) || "",
      image: a.image,
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

function buildFeatured(anilist, trailers) {
  const items = [];
  if (anilist?.animeTrending?.length) {
    for (const a of anilist.animeTrending.slice(0, 4)) {
      items.push({ kind: "anime", ...a });
    }
  }
  if (trailers?.length) {
    for (const v of trailers.slice(0, 2)) {
      items.push({ kind: "trailer", ...v });
    }
  }
  if (anilist?.animeAiring?.length) {
    for (const a of anilist.animeAiring.slice(0, 2)) {
      items.push({ kind: "airing", ...a });
    }
  }
  items.sort(() => Math.random() - 0.5);
  return items.slice(0, 5);
}

function buildRails(anilist, trailers) {
  const rails = [];

  if (trailers?.length) {
    rails.push({ id: "trailers", icon: "🎬", label: "Latest Trailers", items: trailers.slice(0, 10) });
  }

  if (anilist?.animeTrending?.length) {
    rails.push({ id: "trending", icon: "🔥", label: "Trending Now", items: anilist.animeTrending.slice(0, 10).map(a => ({ ...a, kind: "anime" })) });
  }

  if (anilist?.animeAiring?.length) {
    rails.push({ id: "airing", icon: "📺", label: "Currently Airing", items: anilist.animeAiring.slice(0, 10).map(a => ({ ...a, kind: "anime" })) });
  }

  return rails;
}

export function formatTimestamp(dateStr) {
  return formatTimeAgo(dateStr);
}

export function clearAggregatedCache() { cache.clear(); }
