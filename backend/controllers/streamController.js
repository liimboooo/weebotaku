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

  try {
    const results = await provider.search(title);
    if (results.results && results.results.length > 0) {
      const id = results.results[0].id;
      searchCache.set(cacheKey, id);
      return id;
    }
  } catch {}
  return null;
}

exports.getStream = async (req, res) => {
  try {
    const { title, episode } = req.params;
    const ep = parseInt(episode, 10);
    if (!title || !ep || ep < 1) {
      return res.status(400).json({ success: false, message: 'title and episode required' });
    }

    const decodedTitle = decodeURIComponent(title);
    const errors = [];

    try {
      const provider = getHianime();
      const animeId = await findAnimeId(provider, decodedTitle);
      if (animeId) {
        const info = await provider.fetchAnimeInfo(animeId);
        const epData = info.episodes?.find(e => e.number === ep);
        if (epData) {
          const sources = await provider.fetchEpisodeSources(epData.id);
          if (sources.sources?.length > 0) {
            return res.json({
              success: true,
              data: {
                sources: sources.sources.map(s => ({ url: s.url, quality: s.quality })),
                subtitles: sources.subtitles || [],
                provider: 'hianime',
              },
            });
          }
        }
      }
    } catch (e) { errors.push(`hianime: ${e.message}`); }

    try {
      const provider = getAnimekai();
      const animeId = await findAnimeId(provider, decodedTitle);
      if (animeId) {
        const info = await provider.fetchAnimeInfo(animeId);
        const epData = info.episodes?.find(e => e.number === ep);
        if (epData) {
          const sources = await provider.fetchEpisodeSources(epData.id);
          if (sources.sources?.length > 0) {
            return res.json({
              success: true,
              data: {
                sources: sources.sources.map(s => ({ url: s.url, quality: s.quality })),
                subtitles: sources.subtitles || [],
                provider: 'animekai',
              },
            });
          }
        }
      }
    } catch (e) { errors.push(`animekai: ${e.message}`); }

    res.status(404).json({ success: false, message: 'No stream sources found', errors });
  } catch (error) {
    console.error('GetStream error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
