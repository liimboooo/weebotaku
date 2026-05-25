import { fetchAnimeNews } from "./animeNewsApi";

const CF_WORKER = "https://anime-proxy.mohamedlimam80000.workers.dev/?url=";
const FALLBACK_PROXIES = (process.env.REACT_APP_FALLBACK_PROXIES || "").split(",").filter(Boolean);
const YOUTUBE_EMBED = process.env.REACT_APP_YOUTUBE_EMBED_BASE || "https://www.youtube.com/embed/";

const YOUTUBE_CHANNELS = [
  { id: "UC8RGjYSCGptBmCb17MnJv6w", name: "Crunchyroll" },
  { id: "UC7W2ZxqXXd-5GRdCxfpRxKw", name: "Aniplex" },
  { id: "UCVYQVRl5YpFjYrBZUe2y6QQ", name: "Muse Asia" },
  { id: "UCIN5dKgLsMqW56BP1oDNn9A", name: "Toei Animation" },
  { id: "UCXAS_Eo6-l7B-Hy2EDB_F9Q", name: "AnimeLab" },
];

const RSS_FEEDS = [
  { url: "https://www.animenewsnetwork.com/news/rss.xml", source: "Anime News Network" },
  { url: "https://www.crunchyroll.com/news/rss", source: "Crunchyroll News" },
  { url: "https://animecorner.me/feed/", source: "Anime Corner" },
];



const cache = new Map();
const CACHE_TTL = 3 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) { cache.set(key, { data, time: Date.now() }); }

function pickTitle(t) { return t?.english || t?.romaji || "Unknown"; }
function stripHtml(h) { if (!h) return ""; return h.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim(); }

async function fetchWithProxy(url, timeout = 8000) {
  const controllers = [];
  const attempts = [
    () => fetch(CF_WORKER + encodeURIComponent(url)),
    ...FALLBACK_PROXIES.map(p => () => fetch(p + encodeURIComponent(url))),
    () => fetch(url),
  ];
  for (const attempt of attempts) {
    try {
      const c = new AbortController();
      controllers.push(c);
      const res = await attempt();
      if (!res.ok) continue;
      return res;
    } catch {
      continue;
    } finally {
      controllers.forEach(c => c.abort());
    }
  }
  throw new Error("All proxies failed");
}

async function fetchJSON(url) {
  const res = await fetchWithProxy(url);
  return res.json();
}

async function fetchXML(url) {
  const res = await fetchWithProxy(url);
  const text = await res.text();
  const parser = new DOMParser();
  return parser.parseFromString(text, "text/xml");
}

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

async function fetchYouTubeRSS() {
  const items = [];
  for (const channel of YOUTUBE_CHANNELS) {
    try {
      const xml = await fetchXML(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`);
      const entries = xml.querySelectorAll("entry");
      for (let i = 0; i < Math.min(5, entries.length); i++) {
        const entry = entries[i];
        const videoId = entry.querySelector("videoId")?.textContent || "";
        const title = entry.querySelector("title")?.textContent || "";
        const desc = entry.querySelector("group description")?.textContent || entry.querySelector("media\\:description")?.textContent || "";
        const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        const pubDate = entry.querySelector("published")?.textContent || new Date().toISOString();
        items.push({
          id: `yt-${videoId}`,
          type: "trailer",
          source: "youtube",
          sourceLabel: channel.name,
          title,
          description: stripHtml(desc).slice(0, 250),
          image: thumbnail,
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

async function fetchRSS() {
  const items = [];
  for (const feed of RSS_FEEDS) {
    try {
      const xml = await fetchXML(feed.url);
      const entries = xml.querySelectorAll("item");
      for (let i = 0; i < Math.min(10, entries.length); i++) {
        const entry = entries[i];
        const title = entry.querySelector("title")?.textContent || "";
        const link = entry.querySelector("link")?.textContent || "";
        const desc = entry.querySelector("description")?.textContent || "";
        const pubDate = entry.querySelector("pubDate")?.textContent || new Date().toISOString();
        const thumbMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/);
        const image = thumbMatch ? thumbMatch[1] : "";
        const cleanDesc = stripHtml(desc).slice(0, 300);
        items.push({
          id: `rss-${feed.source}-${i}`,
          type: "article",
          source: "rss",
          sourceLabel: feed.source,
          title,
          description: cleanDesc,
          image,
          url: link,
          date: new Date(pubDate).toISOString(),
        });
      }
    } catch {}
  }
  return items;
}

export async function fetchAggregatedNews() {
  const cached = getCached("aggregated");
  if (cached) return cached;

  const [anilistResult, youtubeItems, rssItems] = await Promise.allSettled([
    fetchAnimeNews(),
    fetchYouTubeRSS(),
    fetchRSS(),
  ]);

  const anilist = anilistResult.status === "fulfilled" ? anilistResult.value : null;
  const youtube = youtubeItems.status === "fulfilled" ? youtubeItems.value : [];
  const rss = rssItems.status === "fulfilled" ? rssItems.value : [];

  const allNews = [...(anilist?.allNews || []), ...youtube, ...rss];
  allNews.sort((a, b) => new Date(b.date) - new Date(a.date));

  const result = {
    allNews,
    youtube,
    rss,
    featured: buildFeatured(anilist, youtube),
    trending: anilist?.animeTrending || [],
    airing: anilist?.animeAiring || [],
    popular: anilist?.animePopular || [],
    seasonal: buildSeasonal(anilist),
    rails: buildRails(allNews, youtube, anilist),
  };

  setCache("aggregated", result);
  return result;
}

function buildFeatured(anilist, youtube) {
  const items = [];
  if (anilist?.animeTrending?.length) {
    for (const a of anilist.animeTrending.slice(0, 4)) {
      items.push({ kind: "anime", ...a, date: new Date().toISOString() });
    }
  }
  if (youtube?.length) {
    for (const v of youtube.slice(0, 2)) {
      items.push({ kind: "trailer", ...v });
    }
  }
  if (anilist?.animeAiring?.length) {
    for (const a of anilist.animeAiring.slice(0, 2)) {
      items.push({ kind: "airing", ...a, date: new Date().toISOString() });
    }
  }
  return items.sort(() => Math.random() - 0.5).slice(0, 5);
}

function buildSeasonal(anilist) {
  if (!anilist?.animeUpcoming?.length) return [];
  return anilist.animeUpcoming.slice(0, 10);
}

function buildRails(allNews, youtube, anilist) {
  const rails = [];

  if (youtube?.length) {
    rails.push({ id: "trailers", icon: "🎬", label: "Latest Trailers", items: youtube.slice(0, 10) });
  }

  if (anilist?.animeTrending?.length) {
    rails.push({ id: "trending", icon: "🔥", label: "Trending Now", items: anilist.animeTrending.slice(0, 10).map(a => ({ ...a, kind: "anime" })) });
  }

  const articles = allNews.filter(n => n.source === "rss");
  if (articles.length) {
    rails.push({ id: "industry", icon: "📰", label: "Industry News", items: articles.slice(0, 10) });
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
