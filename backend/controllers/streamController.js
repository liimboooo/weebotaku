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

const GOGO_BASES = ['https://gogoanime3.co', 'https://anitaku.pe', 'https://gogoanime3.net'];

let searchCache = new Map();

async function gogoSearch(title) {
  if (searchCache.has(title)) return searchCache.get(title);
  if (searchCache.size > 200) searchCache.clear();

  for (const base of GOGO_BASES) {
    try {
      const { data } = await axios.get(`${base}/search.html`, {
        params: { keyword: title },
        headers: { 'User-Agent': UA },
        timeout: 6000,
      });

      if (data.includes('Checking your browser')) continue;

      const $ = cheerio.load(data);
      const results = [];
      $('ul.items li').each((i, el) => {
        const a = $(el).find('p.name a, .name a, a');
        const href = a.attr('href') || '';
        const slug = href.replace('/category/', '').replace(/^\//, '');
        if (slug) results.push({ slug, title: a.text().trim(), base });
      });

      if (results.length > 0) {
        searchCache.set(title, results);
        return results;
      }
    } catch {}
  }
  return [];
}

async function gogoGetEpisodeSources(base, slug, ep) {
  const epUrl = `${base}/${slug}-episode-${ep}`;
  const { data } = await axios.get(epUrl, {
    headers: { 'User-Agent': UA },
    timeout: 6000,
  });

  if (data.includes('Checking your browser')) {
    throw new Error('Cloudflare blocked');
  }

  const $ = cheerio.load(data);
  const embedSrc = $('div.anime_video_body_watch_items iframe').attr('src')
    || $('iframe#main-embed').attr('src')
    || $('iframe').attr('src');

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
        const { slug, base } = results[0];
        const sources = await gogoGetEpisodeSources(base, slug, ep);
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
    { name: 'gogoanime3-search', url: 'https://gogoanime3.co/search.html?keyword=Death+Note' },
    { name: 'gogoanime3-ep', url: 'https://gogoanime3.co/death-note-episode-1' },
    { name: 'ajax-gogocdn', url: 'https://ajax.gogocdn.net/site/loadAjaxSearch?keyword=Death+Note&id=-1' },
    { name: 'anitaku-search', url: 'https://anitaku.pe/search.html?keyword=Death+Note' },
    { name: 'gogoanime3-net-search', url: 'https://gogoanime3.net/search.html?keyword=Death+Note' },
  ];

  await Promise.allSettled(tests.map(async (test) => {
    try {
      const resp = await axios.get(test.url, {
        timeout: 8000,
        headers: { 'User-Agent': UA },
        maxRedirects: 3,
      });
      const html = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
      const isCF = html.includes('Checking your browser');
      const $ = cheerio.load(html);
      results[test.name] = {
        status: resp.status,
        length: html.length,
        cloudflare: isCF,
        title: $('title').text().trim().slice(0, 80),
        items: $('ul.items li').length,
        snippet: html.slice(0, 200),
      };
    } catch (e) {
      results[test.name] = { error: e.code || e.message };
    }
  }));

  res.json({ success: true, data: results });
};
