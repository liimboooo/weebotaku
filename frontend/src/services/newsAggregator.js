import { fetchAnimeNews } from "./animeNewsApi";

const YOUTUBE_EMBED = process.env.REACT_APP_YOUTUBE_EMBED_BASE || "https://www.youtube.com/embed/";
const CF_WORKER = "https://anime-proxy.mohamedlimam80000.workers.dev/?url=";
const FALLBACK_PROXIES = (process.env.REACT_APP_FALLBACK_PROXIES || "").split(",").filter(Boolean);

const cache = new Map();
const CACHE_TTL = 3 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) { cache.set(key, { data, time: Date.now() }); }

function stripHtml(h) { if (!h) return ""; return h.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim(); }

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

async function fetchText(url) {
  const attempts = [
    () => fetch(CF_WORKER + encodeURIComponent(url)),
    ...FALLBACK_PROXIES.map(p => () => fetch(p + encodeURIComponent(url))),
    () => fetch(url),
  ];
  for (const attempt of attempts) {
    try {
      const res = await attempt();
      if (!res.ok) continue;
      return await res.text();
    } catch {}
  }
  return null;
}

async function fetchYouTubeRSS() {
  const items = [];
  const channels = [
    { id: "UC8RGjYSCGptBmCb17MnJv6w", name: "Crunchyroll" },
    { id: "UC7W2ZxqXXd-5GRdCxfpRxKw", name: "Aniplex" },
    { id: "UCVYQVRl5YpFjYrBZUe2y6QQ", name: "Muse Asia" },
  ];
  for (const channel of channels) {
    try {
      const text = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`);
      if (!text) continue;
      const xml = new DOMParser().parseFromString(text, "text/xml");
      const entries = xml.querySelectorAll("entry");
      for (let i = 0; i < Math.min(3, entries.length); i++) {
        const entry = entries[i];
        const videoId = entry.querySelector("videoId")?.textContent || "";
        const title = entry.querySelector("title")?.textContent || "";
        const pubDate = entry.querySelector("published")?.textContent || new Date().toISOString();
        if (!videoId) continue;
        items.push({
          id: `yt-${videoId}`,
          type: "trailer",
          source: "youtube",
          sourceLabel: channel.name,
          title,
          description: "",
          image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          videoId,
          embedUrl: `${YOUTUBE_EMBED}${videoId}`,
          url: `https://youtube.com/watch?v=${videoId}`,
          date: pubDate,
        });
      }
    } catch {}
  }
  return items;
}

export async function fetchAggregatedNews() {
  const cached = getCached("aggregated");
  if (cached) return cached;

  const anilist = await fetchAnimeNews().catch(() => null);

  const youtubeRes = await fetchYouTubeRSS().catch(() => []);
  const youtube = Array.isArray(youtubeRes) ? youtubeRes : [];

  const allNews = [...(anilist?.allNews || []), ...youtube];
  allNews.sort((a, b) => new Date(b.date) - new Date(a.date));

  const result = {
    allNews,
    youtube,
    featured: buildFeatured(anilist, youtube),
    trending: anilist?.animeTrending || [],
    airing: anilist?.animeAiring || [],
    popular: anilist?.animePopular || [],
    rails: buildRails(anilist, youtube),
  };

  setCache("aggregated", result);
  return result;
}

function buildFeatured(anilist, youtube) {
  const items = [];
  if (anilist?.animeTrending?.length) {
    for (const a of anilist.animeTrending.slice(0, 4)) {
      items.push({ kind: "anime", ...a });
    }
  }
  if (youtube?.length) {
    for (const v of youtube.slice(0, 2)) {
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

function buildRails(anilist, youtube) {
  const rails = [];

  if (youtube?.length) {
    rails.push({ id: "trailers", icon: "🎬", label: "Latest Trailers", items: youtube.slice(0, 10) });
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
