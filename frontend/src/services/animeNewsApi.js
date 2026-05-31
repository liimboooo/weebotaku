const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();

function getCached(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.time > CACHE_TTL) { cache.delete(key); return null; }
  return e.data;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

function pickTitle(t) { return t?.english || t?.romaji || "Unknown"; }

function mapAnime(a) {
  return {
    id: a.id,
    title: pickTitle(a),
    image: a.coverImage?.large || a.image || "",
    bannerImage: a.bannerImage || a.coverImage?.extraLarge || a.coverImage?.large || "",
    format: a.format || "TV",
    episodes: a.episodes,
    score: a.meanScore ? (a.meanScore / 10).toFixed(1) : a.score,
    trending: a.trending || 0,
    genres: a.genres || [],
    synopsis: (a.synopsis || "").slice(0, 250),
    studio: a.studio || a.studios?.nodes?.[0]?.name || null,
    season: a.season || null,
    status: a.status,
    mediaType: "anime",
    nextEpisode: a.nextEpisode || a.nextAiringEpisode || null,
    trailer: a.trailer || null,
  };
}

function mapManga(m) {
  return {
    id: m.id,
    title: pickTitle(m),
    image: m.coverImage?.large || m.image || "",
    format: m.format || "Manga",
    chapters: m.chapters,
    volumes: m.volumes,
    score: m.meanScore ? (m.meanScore / 10).toFixed(1) : m.score,
    trending: m.trending || 0,
    genres: m.genres || [],
    synopsis: (m.synopsis || "").slice(0, 250),
    status: m.status,
    mediaType: "manga",
  };
}

function buildNewsFeed(anime, manga) {
  const items = [];
  function fmtTime(ts) {
    const d = new Date(ts * 1000);
    const diff = d - Date.now();
    if (diff < 0) return "Now";
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "Soon";
    if (h < 24) return `~${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  for (const a of (anime.animeAiring || [])) {
    const ep = a.nextEpisode || a.nextAiringEpisode;
    items.push({
      id: `airing-${a.id}`, type: "new_episode", mediaType: "anime",
      title: `${a.title} — New Episode`,
      description: ep ? `Episode ${ep.episode || ep.ep} airing ${fmtTime(ep.airingAt || ep.at)}` : "Currently airing",
      image: a.image, bannerImage: a.bannerImage, animeId: a.id,
      animeTitle: a.title, date: ep ? new Date((ep.airingAt || ep.at) * 1000).toISOString() : new Date().toISOString(),
      score: a.score, genres: a.genres,
    });
  }

  for (const a of (anime.animeTrending || [])) {
    items.push({
      id: `trending-${a.id}`, type: "trending", mediaType: "anime",
      title: `${a.title} is Trending`,
      description: `Trending #${a.trending} • ${(a.genres || []).slice(0, 3).join(", ")}`,
      image: a.image, bannerImage: a.bannerImage, animeId: a.id,
      animeTitle: a.title, date: new Date().toISOString(),
      score: a.score, genres: a.genres,
    });
  }

  for (const a of (anime.animeUpcoming || [])) {
    items.push({
      id: `upcoming-${a.id}`, type: "announcement", mediaType: "anime",
      title: `Coming Soon: ${a.title}`,
      description: `${a.format} • ${(a.genres || []).slice(0, 3).join(", ")}`,
      image: a.image, bannerImage: a.bannerImage, animeId: a.id,
      animeTitle: a.title, date: new Date().toISOString(),
      score: a.score, genres: a.genres,
    });
  }

  for (const a of (anime.animePopular || [])) {
    items.push({
      id: `popular-${a.id}`, type: "popular", mediaType: "anime",
      title: `Popular Pick: ${a.title}`,
      description: `Rating: ${a.score}/10 • ${(a.genres || []).slice(0, 3).join(", ")}`,
      image: a.image, bannerImage: a.bannerImage, animeId: a.id,
      animeTitle: a.title, date: new Date().toISOString(),
      score: a.score, genres: a.genres,
    });
  }

  for (const m of (manga.mangaPublishing || [])) {
    items.push({
      id: `manga-pub-${m.id}`, type: "new_chapter", mediaType: "manga",
      title: `${m.title} — New Chapter`,
      description: m.chapters ? `${m.chapters} chapters • ${(m.genres || []).slice(0, 3).join(", ")}` : "Currently publishing",
      image: m.image, animeId: m.id, animeTitle: m.title,
      date: new Date().toISOString(), score: m.score, genres: m.genres,
    });
  }

  for (const m of (manga.mangaTrending || [])) {
    items.push({
      id: `manga-trend-${m.id}`, type: "manga_trending", mediaType: "manga",
      title: `${m.title} Manga is Trending`,
      description: `Trending #${m.trending} • ${(m.genres || []).slice(0, 3).join(", ")}`,
      image: m.image, animeId: m.id, animeTitle: m.title,
      date: new Date().toISOString(), score: m.score, genres: m.genres,
    });
  }

  for (const m of (manga.mangaUpcoming || [])) {
    items.push({
      id: `manga-upcoming-${m.id}`, type: "manga_announcement", mediaType: "manga",
      title: `New Manga: ${m.title}`,
      description: `${m.format} • ${(m.genres || []).slice(0, 3).join(", ")}`,
      image: m.image, animeId: m.id, animeTitle: m.title,
      date: new Date().toISOString(), score: m.score, genres: m.genres,
    });
  }

  for (const m of (manga.mangaPopular || [])) {
    items.push({
      id: `manga-pop-${m.id}`, type: "manga_popular", mediaType: "manga",
      title: `Popular Manga: ${m.title}`,
      description: `Rating: ${m.score}/10 • ${(m.genres || []).slice(0, 3).join(", ")}`,
      image: m.image, animeId: m.id, animeTitle: m.title,
      date: new Date().toISOString(), score: m.score, genres: m.genres,
    });
  }

  return items.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function fetchAnimeNews() {
  const cached = getCached("anime-news");
  if (cached) return cached;

  try {
    const res = await fetch(`${API_BASE}/catalog/news-feed`);
    if (!res.ok) throw new Error('Failed to fetch news feed');
    const json = await res.json();
    if (!json.success) throw new Error('API error');

    const d = json.data;
    const result = {
      animeTrending: (d.animeTrending || []).map(mapAnime),
      animePopular: (d.animePopular || []).map(mapAnime),
      animeUpcoming: (d.animeUpcoming || []).map(mapAnime),
      animeAiring: (d.animeAiring || []).map(mapAnime),
      mangaTrending: (d.mangaTrending || []).map(mapManga),
      mangaPopular: (d.mangaPopular || []).map(mapManga),
      mangaUpcoming: (d.mangaUpcoming || []).map(mapManga),
      mangaPublishing: (d.mangaPublishing || []).map(mapManga),
      allNews: buildNewsFeed(d, d),
    };

    setCache("anime-news", result);
    return result;
  } catch {
    return {
      animeTrending: [], animePopular: [], animeUpcoming: [], animeAiring: [],
      mangaTrending: [], mangaPopular: [], mangaUpcoming: [], mangaPublishing: [],
      allNews: [],
    };
  }
}

export async function fetchMediaById(id) {
  try {
    const res = await fetch(`${API_BASE}/catalog/anime/${id}/details`);
    if (!res.ok) throw new Error("Not found");
    const json = await res.json();
    if (!json.success) throw new Error("Not found");
    return mapAnime(json.data);
  } catch {
    throw new Error("Not found");
  }
}

export function clearNewsCache() { cache.clear(); }
