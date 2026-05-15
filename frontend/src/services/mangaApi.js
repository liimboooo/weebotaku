const BASE = "https://api.mangadex.org";

let lastCall = 0;
const MIN_INTERVAL = 250;

async function mdFetch(path) {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL - (now - lastCall));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`MangaDex error: ${res.status}`);
  return res.json();
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

export async function searchManga(query) {
  for (const q of mangaTitleVariants(query)) {
    const json = await mdFetch(`/manga?title=${encodeURIComponent(q)}&limit=5&order[relevance]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&includes[]=cover_art`);
    if (json.data.length > 0) {
      return json.data.map(m => {
        const coverRel = m.relationships.find(r => r.type === "cover_art");
        const coverFile = coverRel?.attributes?.fileName;
        const title = m.attributes.title?.en || Object.values(m.attributes.title || {})[0] || "Unknown";
        return {
          id: m.id,
          title,
          altTitles: m.attributes.altTitles || [],
          description: m.attributes.description?.en || "",
          coverUrl: coverFile ? `https://uploads.mangadex.org/covers/${m.id}/${coverFile}.256.jpg` : null,
          status: m.attributes.status || "unknown",
          year: m.attributes.year,
          tags: m.attributes.tags?.map(t => t.attributes.name.en) || [],
          originalLanguage: m.attributes.originalLanguage,
          availableLanguages: m.attributes.availableTranslatedLanguages || [],
          author: m.relationships.find(r => r.type === "author")?.attributes?.name || "Unknown",
        };
      });
    }
  }
  return [];
}

export async function getMangaChapters(mangaId, lang = "en") {
  const json = await mdFetch(`/manga/${mangaId}/feed?translatedLanguage[]=${lang}&limit=500&order[chapter]=desc&includes[]=scanlation_group`);
  return json.data
    .filter(ch => !ch.attributes.externalUrl && ch.attributes.pages > 0)
    .map(ch => ({
      id: ch.id,
      chapter: ch.attributes.chapter,
      title: ch.attributes.title || "",
      volume: ch.attributes.volume || "",
      pages: ch.attributes.pages || 0,
      publishAt: ch.attributes.publishAt,
      group: ch.relationships.find(r => r.type === "scanlation_group")?.attributes?.name || "",
    }));
}

export async function getChapterPages(chapterId, quality = "data") {
  const json = await mdFetch(`/at-home/server/${chapterId}`);
  const base = json.baseUrl;
  const hash = json.chapter.hash;
  const q = quality === "data-saver" && json.chapter["data-saver"]?.length > 0 ? "data-saver" : "data";
  const files = json.chapter[q];
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
  const m = json.data;
  const coverRel = m.relationships.find(r => r.type === "cover_art");
  const coverFile = coverRel?.attributes?.fileName;
  const title = m.attributes.title?.en || Object.values(m.attributes.title || {})[0] || "Unknown";
  return {
    id: m.id,
    title,
    description: m.attributes.description?.en || "",
    coverUrl: coverFile ? `https://uploads.mangadex.org/covers/${m.id}/${coverFile}.256.jpg` : null,
    status: m.attributes.status || "unknown",
    year: m.attributes.year,
    tags: m.attributes.tags?.map(t => t.attributes.name.en) || [],
    author: m.relationships.find(r => r.type === "author")?.attributes?.name || "Unknown",
  };
}
