const { ANIME } = require('@consumet/extensions');
const { hentaiStream } = require('./hentaiService');

let hianime = null;
let animepahe = null;
let animeunity = null;

function getHianime() {
  if (!hianime) hianime = new ANIME.Hianime();
  return hianime;
}

function getAnimePahe() {
  if (!animepahe) animepahe = new ANIME.AnimePahe();
  return animepahe;
}

function getAnimeUnity() {
  if (!animeunity) animeunity = new ANIME.AnimeUnity();
  return animeunity;
}

function getProviderInstance(provider) {
  if (provider === 'animepahe') return getAnimePahe();
  if (provider === 'animeunity') return getAnimeUnity();
  return getHianime();
}

async function searchByTitle(title, provider = 'hianime') {
  const p = getProviderInstance(provider);
  const res = await p.search(title);
  return res.results || [];
}

async function getAnimeInfo(providerId, provider = 'hianime') {
  const p = getProviderInstance(provider);
  return await p.fetchAnimeInfo(providerId);
}

async function getEpisodeSources(episodeId, provider = 'hianime') {
  const p = getProviderInstance(provider);
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
    score: scoreMatch(r.title, title) + (r.id == anilistId ? 50 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (top.score <= 30) return null;
  return top;
}

async function tryProviderStream(anilistId, episodeNum, category, animeTitle, provider) {
  const results = await searchByTitle(animeTitle, provider);
  if (!results.length) return null;

  const scored = results.map(r => ({
    id: r.id,
    title: r.title,
    score: scoreMatch(r.title, animeTitle) + (r.id == anilistId ? 50 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (top.score <= 30) return null;

  try {
    const info = await getAnimeInfo(top.id, provider);
    if (!info.episodes || !Array.isArray(info.episodes)) return null;
    const ep = info.episodes.find(e => e.number === episodeNum);
    if (!ep || !ep.id) return null;
    const sources = await getEpisodeSources(ep.id, provider);
    if (!sources) return null;
    const hlsSources = (sources.sources || []).filter(s => s.url && (s.isM3U8 || s.url.includes('.m3u8')));
    if (!hlsSources.length) return null;
    const best = hlsSources.find(s => s.quality === 'default' || s.quality === 'auto') || hlsSources[0];
    return {
      provider: `consumet:${provider}`,
      stream: { url: best.url, quality: best.quality || 'auto' },
      subtitles: (sources.subtitles || []).map(s => ({ url: s.url, label: s.label || '' })),
      intro: null,
      outro: null,
    };
  } catch {
    return null;
  }
}

exports.consumetStream = async (anilistId, episodeNum, category = 'sub', animeTitle) => {
  const title = animeTitle || '';
  if (!title) return null;

  try {
    const match = await findBestMatch(title, anilistId);
    if (match) {
      try {
        const info = await getAnimeInfo(match.id);
        if (info.episodes && Array.isArray(info.episodes)) {
          const ep = info.episodes.find(e => e.number === episodeNum);
          if (ep && ep.id) {
            const sources = await getEpisodeSources(ep.id);
            if (sources) {
              const hlsSources = (sources.sources || []).filter(s => s.url && (s.isM3U8 || s.url.includes('.m3u8')));
              if (hlsSources.length) {
                const best = hlsSources.find(s => s.quality === 'default' || s.quality === 'auto') || hlsSources[0];
                return {
                  provider: 'consumet:hianime',
                  stream: { url: best.url, quality: best.quality || 'auto' },
                  subtitles: (sources.subtitles || []).map(s => ({ url: s.url, label: s.label || '' })),
                  intro: null,
                  outro: null,
                };
              }
            }
          }
        }
      } catch {}
    }
  } catch (e) {
    console.error('[consumet] Hianime path failed:', e.message);
  }

  const paheResult = await tryProviderStream(anilistId, episodeNum, category, title, 'animepahe').catch(() => null);
  if (paheResult) return paheResult;

  // AnimeUnity (animeunity.to) is currently the only Consumet provider responding.
  // Note: catalog is mostly Italian dubs, but it returns playable HLS.
  const unityResult = await tryProviderStream(anilistId, episodeNum, category, title, 'animeunity').catch(() => null);
  if (unityResult) return unityResult;

  return hentaiStream(title, episodeNum);
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
