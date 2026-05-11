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

export async function searchManga(query) {
  const q = encodeURIComponent(query);
  const json = await mdFetch(`/manga?title=${q}&limit=20&order[relevance]=desc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&includes[]=cover_art`);
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

export async function getChapterPages(chapterId, quality = "data-saver") {
  const json = await mdFetch(`/at-home/server/${chapterId}`);
  const base = json.baseUrl;
  const hash = json.chapter.hash;
  const files = json.chapter[quality];
  return files.map(f => `${base}/${quality}/${hash}/${f}`);
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
