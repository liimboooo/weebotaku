const BASE = "https://api.mangadex.org";
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

let lastCall = 0;
const MIN_INTERVAL = 250;

async function mdFetch(path) {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL - (now - lastCall));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();

  // Always route through backend proxy to avoid CORS
  const url = `${API_BASE}/scrape/fetch?url=${encodeURIComponent(BASE + path)}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        return JSON.parse(json.data);
      }
    }
  } catch {}

  // Fallback: direct MangaDex fetch (works for local dev without backend)
  let err;
  try {
    const res = await fetch(`${BASE}${path}`);
    if (res.ok) return await res.json();
    err = new Error(`MangaDex error: ${res.status}`);
  } catch (e) {
    err = e;
  }
  throw err;
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
    }));
}

export async function getChapterPages(chapterId, quality = "data") {
  const json = await mdFetch(`/at-home/server/${chapterId}`);
  if (!json.baseUrl || !json.chapter?.hash) throw new Error("Invalid at-home response");
  const base = json.baseUrl;
  const hash = json.chapter.hash;
  const q = quality === "data-saver" && json.chapter["data-saver"]?.length > 0 ? "data-saver" : "data";
  const files = json.chapter[q];
  if (!files?.length) throw new Error("No pages found for this chapter");
  return files.map(f => `${base}/${q}/${hash}/${f}`);
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

export async function getMangaById(mangaId) {
  const json = await mdFetch(`/manga/${mangaId}?includes[]=cover_art&includes[]=author`);
  if (!json?.data) throw new Error("Manga not found");
  const m = json.data;
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
