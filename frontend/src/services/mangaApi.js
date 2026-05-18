const BASE = "https://api.mangadex.org";
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

let lastCall = 0;
const MIN_INTERVAL = 250;

async function mdFetch(path) {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL - (now - lastCall));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();

  // Try direct MangaDex API first (supports CORS from browser)
  try {
    const direct = await fetch(`${BASE}${path}`);
    if (direct.ok) return await direct.json();
  } catch {}

  // Fallback to backend proxy (for production with running backend)
  try {
    const url = `${API_BASE}/scrape/fetch?url=${encodeURIComponent(BASE + path)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.success) return JSON.parse(json.data);
    }
  } catch {}

  throw new Error('MangaDex unavailable');
}

function cleanTitle(title) {
  return title.replace(/\s*\([^)]*\)/g, "").replace(/[^\w\s-]/g, "").trim();
}

function mangaTitleVariants(title) {
  const clean = cleanTitle(title);
  const variants = [
    title,
    clean,
    title.split(":")[0].trim(),
    title.split("(")[0].trim(),
    title.replace(/\s+[-\u2013]\s+.*/, "").trim(),
    title.replace(/'/g, ""),
  ];
  return [...new Set(variants.filter(s => s && s.length > 2))];
}

function titleScore(query, title) {
  const norm = s => s.toLowerCase().replace(/[-_'"/.]+/g, " ").replace(/\s+/g, " ").trim();
  const q = norm(query);
  const t = norm(title);
  if (t === q) return 100;
  if (t.startsWith(q)) return 85;
  if (t.includes(q)) return 70;
  const qWords = new Set(q.split(/\s+/));
  const tWords = t.split(/\s+/);
  const overlap = tWords.filter(w => qWords.has(w)).length;
  if (overlap > 0) return 40 + (overlap / Math.max(qWords.size, 1)) * 30;
  return 0;
}

function mapMangaResult(m) {
  const coverRel = m.relationships?.find(r => r.type === "cover_art");
  const coverFile = coverRel?.attributes?.fileName;
  const title = m.attributes?.title?.en || Object.values(m.attributes?.title || {})[0] || "Unknown";
  return {
    id: m.id,
    title,
    altTitles: m.attributes?.altTitles || [],
    description: m.attributes?.description?.en || "",
    coverUrl: coverFile ? `https://uploads.mangadex.org/covers/${m.id}/${coverFile}.256.jpg` : null,
    status: m.attributes?.status || "unknown",
    year: m.attributes?.year,
    tags: m.attributes?.tags?.map(t => t.attributes.name.en) || [],
    originalLanguage: m.attributes?.originalLanguage,
    availableLanguages: m.attributes?.availableTranslatedLanguages || [],
    author: m.relationships?.find(r => r.type === "author")?.attributes?.name || "Unknown",
  };
}

export async function searchManga(query) {
  let allResults = [];
  for (const q of mangaTitleVariants(query)) {
    const json = await mdFetch(`/manga?title=${encodeURIComponent(q)}&limit=10&order[relevance]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&includes[]=cover_art`);
    if (json.data.length > 0) {
      allResults = json.data;
      break;
    }
  }
  if (allResults.length === 0) return [];
  const scored = allResults
    .map(m => ({ m, score: titleScore(query, m.attributes.title?.en || Object.values(m.attributes.title || {})[0] || "") }))
    .filter(s => s.score >= 40)
    .sort((a, b) => b.score - a.score);
  if (scored.length === 0) return allResults.slice(0, 3).map(mapMangaResult);
  return scored.map(s => mapMangaResult(s.m));
}

export async function getMangaChapters(mangaId, lang = "en") {
  const json = await mdFetch(`/manga/${mangaId}/feed?translatedLanguage[]=${lang}&limit=500&order[chapter]=desc&includes[]=scanlation_group`);
  if (!json?.data) return [];
  return json.data
    .filter(ch => ch?.attributes && !ch.attributes.externalUrl && ch.attributes.pages > 0)
    .map(ch => ({
      id: ch.id,
      chapter: ch.attributes.chapter,
      title: ch.attributes.title || "",
      volume: ch.attributes.volume || "",
      pages: ch.attributes.pages || 0,
      publishAt: ch.attributes.publishAt,
      group: ch.relationships?.find(r => r.type === "scanlation_group")?.attributes?.name || "",
      provider: "mangadex",
    }));
}

export async function getChapterPages(chapterId, quality = "data") {
  const json = await mdFetch(`/at-home/server/${chapterId}`);
  if (!json.baseUrl || !json.chapter?.hash) throw new Error("Invalid at-home response");
  const base = json.baseUrl;
  const hash = json.chapter.hash;
  const files = json.chapter[quality];
  if (!files?.length) throw new Error(`No pages found for quality: ${quality}`);
  return files.map(f => `${base}/${quality}/${hash}/${f}`);
}

export async function getChapterPagesWithFallback(chapterId) {
  try {
    return await getChapterPages(chapterId, "data");
  } catch {
    try {
      return await getChapterPages(chapterId, "data-saver");
    } catch {
      throw new Error("Failed to load chapter pages.");
    }
  }
}

export async function searchComick(query) {
  return [];
}

export async function getComickChapters(slug) {
  return [];
}

export async function getComickChapterPages(chapterHid) {
  throw new Error('Comick unavailable');
}

export async function searchMangaNato(query) {
  const queries = mangaTitleVariants(query);
  const seen = new Set();
  for (const q of queries) {
    try {
      const res = await fetch(`${API_BASE}/scrape/manga-alt-search?q=${encodeURIComponent(q)}`);
      if (!res.ok) continue;
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        return json.data.filter(m => {
          const key = m.id || m.title;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).map(m => ({ ...m, provider: 'manganato' }));
      }
    } catch { continue; }
  }
  return [];
}

export async function getMangaNatoChapters(id) {
  const res = await fetch(`${API_BASE}/scrape/manga-alt-chapters?id=${encodeURIComponent(id)}`);
  if (!res.ok) return [];
  const json = await res.json();
  if (!json.success) return [];
  return json.data;
}

export async function getMangaNatoPages(id) {
  const res = await fetch(`${API_BASE}/scrape/manga-alt-pages?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Failed to fetch pages");
  const json = await res.json();
  if (!json.success || !json.data.length) throw new Error("No pages found");
  return json.data;
}

export async function searchToonily(query) {
  const queries = mangaTitleVariants(query);
  const seen = new Set();
  for (const q of queries) {
    try {
      const res = await fetch(`${API_BASE}/scrape/manga-toonily-search?q=${encodeURIComponent(q)}`);
      if (!res.ok) continue;
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        return json.data.filter(m => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        }).map(m => ({ ...m, provider: 'toonily' }));
      }
    } catch { continue; }
  }
  return [];
}

export async function getToonilyChapters(id) {
  const res = await fetch(`${API_BASE}/scrape/manga-toonily-chapters?id=${encodeURIComponent(id)}`);
  if (!res.ok) return [];
  const json = await res.json();
  if (!json.success) return [];
  return json.data;
}

export async function getToonilyPages(id) {
  const res = await fetch(`${API_BASE}/scrape/manga-toonily-pages?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Failed to fetch pages");
  const json = await res.json();
  if (!json.success || !json.data.length) throw new Error("No pages found");
  return json.data;
}

export async function searchBato(query) {
  const queries = mangaTitleVariants(query);
  const seen = new Set();
  for (const q of queries) {
    try {
      const res = await fetch(`${API_BASE}/scrape/manga-bato-search?q=${encodeURIComponent(q)}`);
      if (!res.ok) continue;
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        return json.data.filter(m => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        }).map(m => ({ ...m, provider: 'bato' }));
      }
    } catch { continue; }
  }
  return [];
}

export async function getBatoChapters(id) {
  const res = await fetch(`${API_BASE}/scrape/manga-bato-chapters?id=${encodeURIComponent(id)}`);
  if (!res.ok) return [];
  const json = await res.json();
  if (!json.success) return [];
  return json.data;
}

export async function getBatoPages(id) {
  const res = await fetch(`${API_BASE}/scrape/manga-bato-pages?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Failed to fetch pages");
  const json = await res.json();
  if (!json.success || !json.data.length) throw new Error("No pages found");
  return json.data;
}

const isMangaDexUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export async function getMangaById(mangaId) {
  if (isMangaDexUUID(mangaId)) {
    const json = await mdFetch(`/manga/${mangaId}?includes[]=cover_art&includes[]=author`);
    if (!json?.data) throw new Error("Manga not found");
    return parseMangaDexManga(json.data);
  }
  throw new Error("Non-UUID manga ID — use searchAndGetManga for title-based lookup");
}

function parseMangaDexManga(m) {
  const coverRel = m.relationships?.find(r => r.type === "cover_art");
  const coverFile = coverRel?.attributes?.fileName;
  const title = m.attributes?.title?.en || Object.values(m.attributes?.title || {})[0] || "Unknown";
  return {
    id: m.id,
    title,
    description: m.attributes?.description?.en || "",
    coverUrl: coverFile ? `https://uploads.mangadex.org/covers/${m.id}/${coverFile}.256.jpg` : null,
    status: m.attributes?.status || "unknown",
    year: m.attributes?.year,
    tags: m.attributes?.tags?.map(t => t.attributes.name.en) || [],
    author: m.relationships?.find(r => r.type === "author")?.attributes?.name || "Unknown",
  };
}

export async function searchAndGetManga(titleOrId) {
  if (isMangaDexUUID(titleOrId)) {
    return getMangaById(titleOrId);
  }
  const results = await searchManga(titleOrId);
  if (results.length > 0) return results[0];
  throw new Error("Manga not found on MangaDex");
}
