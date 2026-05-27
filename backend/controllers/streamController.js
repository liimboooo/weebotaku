const axios = require('axios');
const cheerio = require('cheerio');

let gogoCDN = null;
function getGogoCDN() {
  if (!gogoCDN) {
    const { GogoCDN } = require('@consumet/extensions/dist/extractors');
    gogoCDN = new GogoCDN();
  }
  return gogoCDN;
}

const GOGO_BASE = 'https://anitaku.pe';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let searchCache = new Map();

async function gogoSearch(title) {
  if (searchCache.has(title)) return searchCache.get(title);
  if (searchCache.size > 200) searchCache.clear();

  const { data } = await axios.get(`${GOGO_BASE}/search.html`, {
    params: { keyword: title },
    headers: { 'User-Agent': UA },
    timeout: 8000,
  });

  const $ = cheerio.load(data);
  const results = [];
  $('div.last_episodes ul.items li').each((i, el) => {
    const a = $(el).find('p.name a');
    const href = a.attr('href') || '';
    const slug = href.replace('/category/', '');
    results.push({ slug, title: a.text().trim() });
  });

  if (results.length > 0) {
    searchCache.set(title, results);
  }
  return results;
}

async function gogoGetEpisodeSources(slug, ep) {
  const epUrl = `${GOGO_BASE}/${slug}-episode-${ep}`;
  const { data } = await axios.get(epUrl, {
    headers: { 'User-Agent': UA },
    timeout: 8000,
  });

  const $ = cheerio.load(data);
  const embedSrc = $('div.anime_video_body_watch_items iframe').attr('src')
    || $('iframe').attr('src');

  if (!embedSrc) return null;

  const embedUrl = embedSrc.startsWith('http') ? embedSrc : `https:${embedSrc}`;
  const extractor = getGogoCDN();
  const sources = await extractor.extract(new URL(embedUrl));
  return sources;
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
      const results = await gogoSearch(decodedTitle);
      debug.searchResults = results.length;
      debug.firstResult = results[0]?.slug || 'none';

      if (results.length > 0) {
        const slug = results[0].slug;
        const sources = await gogoGetEpisodeSources(slug, ep);
        debug.sourcesFound = sources?.sources?.length || 0;

        if (sources?.sources?.length > 0) {
          return res.json({
            success: true,
            data: {
              sources: sources.sources.map(s => ({
                url: s.url,
                quality: s.quality || 'default',
                isM3U8: s.isM3U8 || s.url?.includes('.m3u8'),
              })),
              subtitles: sources.subtitles || [],
              provider: 'gogoanime',
            },
          });
        }
      }
    } catch (e) {
      debug.error = e.message;
    }

    res.status(404).json({ success: false, message: 'No stream sources found', debug });
  } catch (error) {
    console.error('GetStream error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.testProviders = async (req, res) => {
  const results = {};

  const tests = [
    { name: 'anitaku-home', url: `${GOGO_BASE}/` },
    { name: 'anitaku-search', url: `${GOGO_BASE}/search.html?keyword=Death+Note` },
    { name: 'anitaku-ep', url: `${GOGO_BASE}/death-note-episode-1` },
    { name: 'gogoanime3-home', url: 'https://gogoanime3.co/' },
  ];

  await Promise.allSettled(tests.map(async (test) => {
    try {
      const resp = await axios.get(test.url, {
        timeout: 8000,
        headers: { 'User-Agent': UA },
        maxRedirects: 3,
      });
      const $ = cheerio.load(resp.data);
      results[test.name] = {
        status: resp.status,
        length: resp.data?.length || 0,
        title: $('title').text().trim().slice(0, 80),
        hasItems: $('ul.items li').length,
      };
    } catch (e) {
      results[test.name] = { error: e.code || e.message };
    }
  }));

  res.json({ success: true, data: results });
};
