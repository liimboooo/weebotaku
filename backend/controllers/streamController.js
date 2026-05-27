const { ANIME } = require('@consumet/extensions');

let hianime = null;
let animekai = null;

function getHianime() {
  if (!hianime) hianime = new ANIME.Hianime();
  return hianime;
}
function getAnimekai() {
  if (!animekai) animekai = new ANIME.AnimeKai();
  return animekai;
}

let searchCache = new Map();

async function findAnimeId(provider, title) {
  const cacheKey = `${provider.name}-${title}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey);
  if (searchCache.size > 200) searchCache.clear();

  const results = await provider.search(title);
  if (results.results && results.results.length > 0) {
    const id = results.results[0].id;
    searchCache.set(cacheKey, id);
    return id;
  }
  return null;
}

async function tryProvider(provider, providerName, decodedTitle, ep) {
  const steps = [];
  const animeId = await findAnimeId(provider, decodedTitle);
  steps.push(`search: ${animeId || 'no results'}`);
  if (!animeId) return { sources: null, steps };

  const info = await provider.fetchAnimeInfo(animeId);
  steps.push(`episodes: ${info.episodes?.length || 0}`);
  const epData = info.episodes?.find(e => e.number === ep);
  steps.push(`ep${ep}: ${epData ? epData.id : 'not found'}`);
  if (!epData) return { sources: null, steps };

  const sources = await provider.fetchEpisodeSources(epData.id);
  steps.push(`sources: ${sources.sources?.length || 0}`);
  if (sources.sources?.length > 0) {
    return {
      sources: {
        sources: sources.sources.map(s => ({ url: s.url, quality: s.quality })),
        subtitles: sources.subtitles || [],
        provider: providerName,
      },
      steps,
    };
  }
  return { sources: null, steps };
}

exports.getStream = async (req, res) => {
  try {
    const { title, episode } = req.params;
    const ep = parseInt(episode, 10);
    if (!title || !ep || ep < 1) {
      return res.status(400).json({ success: false, message: 'title and episode required' });
    }

    const decodedTitle = decodeURIComponent(title);
    const debug = {};

    try {
      const result = await tryProvider(getHianime(), 'hianime', decodedTitle, ep);
      debug.hianime = result.steps;
      if (result.sources) {
        return res.json({ success: true, data: result.sources });
      }
    } catch (e) { debug.hianime = e.message; }

    try {
      const result = await tryProvider(getAnimekai(), 'animekai', decodedTitle, ep);
      debug.animekai = result.steps;
      if (result.sources) {
        return res.json({ success: true, data: result.sources });
      }
    } catch (e) { debug.animekai = e.message; }

    res.status(404).json({ success: false, message: 'No stream sources found', debug });
  } catch (error) {
    console.error('GetStream error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
