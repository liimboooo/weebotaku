const { ANIME } = require('@consumet/extensions');

let hianime = null;
let animepahe = null;

function getHianime() {
  if (!hianime) hianime = new ANIME.Hianime();
  return hianime;
}

function getAnimePahe() {
  if (!animepahe) animepahe = new ANIME.AnimePahe();
  return animepahe;
}

async function searchByTitle(title, provider = 'hianime') {
  const p = provider === 'animepahe' ? getAnimePahe() : getHianime();
  const res = await p.search(title);
  return res.results || [];
}

async function getAnimeInfo(providerId, provider = 'hianime') {
  const p = provider === 'animepahe' ? getAnimePahe() : getHianime();
  return await p.fetchAnimeInfo(providerId);
}

async function getEpisodeSources(episodeId, provider = 'hianime') {
  const p = provider === 'animepahe' ? getAnimePahe() : getHianime();
  return await p.fetchEpisodeSources(episodeId);
}

function scoreMatch(title, query) {
  const t = title.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 999;
  const tWords = [...new Set(t.split(/\W+/).filter(Boolean))];
  const qWords = [...new Set(q.split(/\W+/).filter(Boolean))];
  const overlap = qWords.filter(w => tWords.includes(w)).length;
  let score = overlap * 20;
  if (overlap === qWords.length) score += 100;
  for (const w of qWords) if (w.length > 3 && tWords.includes(w)) score += 10;
  if (t.includes(q)) score += 80;
  return score;
}

async function findBestMatch(title, anilistId) {
  const results = await searchByTitle(title);
  if (results.length === 0) return null;
  const scored = results.map(r => ({
    id: r.id,
    title: r.title,
    score: scoreMatch(r.title, title) + (r.id === anilistId ? 50 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].score > 10 ? scored[0] : null;
}

exports.consumetStream = async (anilistId, episodeNum, category = 'sub', animeTitle) => {
  const title = animeTitle || '';
  if (!title) return null;

  const match = await findBestMatch(title, anilistId);
  if (!match) return null;

  try {
    const info = await getAnimeInfo(match.id);
    if (!info.episodes || !Array.isArray(info.episodes)) return null;

    const ep = info.episodes.find(e => e.number === episodeNum);
    if (!ep || !ep.id) return null;

    const sources = await getEpisodeSources(ep.id);
    if (!sources) return null;

    const hlsSources = (sources.sources || []).filter(s => s.url && (s.isM3U8 || s.url.includes('.m3u8')));
    if (hlsSources.length === 0) return null;

    const best = hlsSources.find(s => s.quality === 'default' || s.quality === 'auto') || hlsSources[0];

    return {
      provider: `consumet:hianime`,
      stream: { url: best.url, quality: best.quality || 'auto' },
      subtitles: (sources.subtitles || []).map(s => ({ url: s.url, label: s.label || '' })),
      intro: null,
      outro: null,
    };
  } catch {
    return null;
  }
};

exports.consumetSearch = async (query) => {
  const results = await searchByTitle(query);
  return results.map(r => ({
    id: r.id,
    title: r.title,
    image: r.image || null,
    url: r.url || null,
  }));
};

exports.consumetDirectSource = async (providerId, episodeNum) => {
  try {
    const info = await getAnimeInfo(providerId);
    if (!info.episodes || !Array.isArray(info.episodes)) return null;
    const ep = info.episodes.find(e => e.number === episodeNum);
    if (!ep || !ep.id) return null;
    const sources = await getEpisodeSources(ep.id);
    if (!sources) return null;
    const hlsSources = (sources.sources || []).filter(s => s.url && (s.isM3U8 || s.url.includes('.m3u8')));
    if (hlsSources.length === 0) return null;
    const best = hlsSources.find(s => s.quality === 'default' || s.quality === 'auto') || hlsSources[0];
    return {
      provider: `consumet:hianime`,
      stream: { url: best.url, quality: best.quality || 'auto' },
      subtitles: (sources.subtitles || []).map(s => ({ url: s.url, label: s.label || '' })),
      intro: null,
      outro: null,
    };
  } catch {
    return null;
  }
};
