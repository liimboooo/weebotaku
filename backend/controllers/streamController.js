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

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const AJAX_BASE = 'https://ajax.gogocdn.net';
const GOGO_BASE = 'https://gogoanime3.co';

let searchCache = new Map();

async function gogoSearch(title) {
  if (searchCache.has(title)) return searchCache.get(title);
  if (searchCache.size > 200) searchCache.clear();

  const { data } = await axios.get(`${AJAX_BASE}/site/loadAjaxSearch`, {
    params: { keyword: title, id: -1 },
    headers: { 'User-Agent': UA },
    timeout: 8000,
  });

  const html = data.content || data;
  const $ = cheerio.load(typeof html === 'string' ? html : JSON.stringify(html));
  const results = [];
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    const slug = href.replace('/category/', '').replace(/^\//, '');
    if (slug) results.push({ slug, title: $(el).text().trim() });
  });

  if (results.length > 0) searchCache.set(title, results);
  return results;
}

async function gogoGetEpisodeSources(slug, ep) {
  const epUrl = `${GOGO_BASE}/${slug}-episode-${ep}`;
  const { data } = await axios.get(epUrl, {
    headers: { 'User-Agent': UA },
    timeout: 8000,
  });

  const $ = cheerio.load(data);
  const embedSrc = $('iframe').attr('src');

  if (!embedSrc) throw new Error('No embed iframe found');

  const embedUrl = embedSrc.startsWith('http') ? embedSrc : `https:${embedSrc}`;
  const extractor = getGogoCDN();
  return await extractor.extract(new URL(embedUrl));
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
      debug.firstResult = results[0] || 'none';

      if (results.length > 0) {
        const { slug } = results[0];
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
      debug.stack = e.stack?.split('\n').slice(0, 3);
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
    { name: 'ajax-search', url: `${AJAX_BASE}/site/loadAjaxSearch?keyword=Death+Note&id=-1` },
    { name: 'gogo-ep-page', url: `${GOGO_BASE}/death-note-episode-1` },
  ];

  await Promise.allSettled(tests.map(async (test) => {
    try {
      const resp = await axios.get(test.url, {
        timeout: 8000,
        headers: { 'User-Agent': UA },
      });
      const raw = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
      results[test.name] = {
        status: resp.status,
        length: raw.length,
        content: raw.slice(0, 500),
      };
    } catch (e) {
      results[test.name] = { error: e.code || e.message };
    }
  }));

  res.json({ success: true, data: results });
};
