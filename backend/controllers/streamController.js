const { ANIME } = require('@consumet/extensions');

const gogoanime = new ANIME.Gogoanime();
const zoro = new ANIME.Zoro();

let searchCache = new Map();

async function findAnimeId(provider, title, anilistId) {
  const cacheKey = `${provider.name}-${anilistId || title}`;
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

    // Try Gogoanime first
    try {
      const animeId = await findAnimeId(gogoanime, decodedTitle);
      if (animeId) {
        const info = await gogoanime.fetchAnimeInfo(animeId);
        const epData = info.episodes?.find(e => e.number === ep);
        if (epData) {
          const sources = await gogoanime.fetchEpisodeSources(epData.id);
          if (sources.sources?.length > 0) {
            return res.json({
              success: true,
              data: {
                sources: sources.sources.map(s => ({ url: s.url, quality: s.quality })),
                subtitles: sources.subtitles || [],
                provider: 'gogoanime',
              },
            });
          }
        }
      }
    } catch (e) { errors.push(`gogoanime: ${e.message}`); }

    // Fallback to Zoro
    try {
      const animeId = await findAnimeId(zoro, decodedTitle);
      if (animeId) {
        const info = await zoro.fetchAnimeInfo(animeId);
        const epData = info.episodes?.find(e => e.number === ep);
        if (epData) {
          const sources = await zoro.fetchEpisodeSources(epData.id);
          if (sources.sources?.length > 0) {
            return res.json({
              success: true,
              data: {
                sources: sources.sources.map(s => ({ url: s.url, quality: s.quality })),
                subtitles: sources.subtitles || [],
                provider: 'zoro',
              },
            });
          }
        }
      }
    } catch (e) { errors.push(`zoro: ${e.message}`); }

    res.status(404).json({ success: false, message: 'No stream sources found', errors });
  } catch (error) {
    console.error('GetStream error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
