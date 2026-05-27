const https = require('https');
const http = require('http');
const zlib = require('zlib');
const fetch = require('node-fetch');

const MIRURO_PIPE = 'https://www.miruro.tv/api/secure/pipe';
const ANILIST_URL = 'https://graphql.anilist.co';
const PIPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://www.miruro.tv/',
};

const PROVIDER_PRIORITY = ['kiwi', 'bee', 'dune', 'ally', 'hop'];

function encodePipeRequest(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url').replace(/=+$/, '');
}

function decodePipeResponse(encoded) {
  const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
  const compressed = Buffer.from(padded, 'base64url');
  return JSON.parse(zlib.gunzipSync(compressed).toString('utf-8'));
}

function decodeEpId(b64) {
  try {
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return Buffer.from(padded, 'base64url').toString('utf-8');
  } catch { return b64; }
}

function deepTranslateIds(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(item => { if (typeof item === 'object' && item) deepTranslateIds(item); });
  } else if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'id' && typeof value === 'string') obj[key] = decodeEpId(value);
      else if (typeof value === 'object' && value) deepTranslateIds(value);
    }
  }
}

async function pipeFetch(payload) {
  const encoded = encodePipeRequest(payload);
  const url = `${MIRURO_PIPE}?e=${encoded}`;
  const res = await fetch(url, { headers: PIPE_HEADERS, timeout: 15000 });
  if (!res.ok) throw new Error(`Pipe returned ${res.status}`);
  const body = (await res.text()).trim();
  return decodePipeResponse(body);
}

async function anilistSearch(query) {
  const gql = `query ($search: String) {
    Page(page: 1, perPage: 10) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id title { romaji english native }
        coverImage { large }
        format episodes status seasonYear
      }
    }
  }`;
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: gql, variables: { search: query } }),
    timeout: 10000,
  });
  if (!res.ok) throw new Error('AniList query failed');
  const data = await res.json();
  return data.data?.Page?.media || [];
}

exports.searchAnime = async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ success: false, message: 'q parameter required' });
    const results = await anilistSearch(q);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getEpisodes = async (req, res) => {
  try {
    const anilistId = parseInt(req.params.anilistId, 10);
    if (!anilistId) return res.status(400).json({ success: false, message: 'anilistId required' });

    const data = await pipeFetch({
      path: 'episodes', method: 'GET',
      query: { anilistId }, body: null, version: '0.1.0',
    });
    deepTranslateIds(data);

    const providers = data.providers || {};
    const simplified = {};
    for (const [pname, pdata] of Object.entries(providers)) {
      const episodes = pdata.episodes || {};
      simplified[pname] = {};
      const cats = typeof episodes === 'object' && !Array.isArray(episodes) ? episodes : { sub: episodes };
      for (const [cat, epList] of Object.entries(cats)) {
        if (!Array.isArray(epList)) continue;
        simplified[pname][cat] = epList.map(ep => ({
          number: ep.number,
          title: ep.title || `Episode ${ep.number}`,
          id: ep.id,
          image: ep.image || null,
        }));
      }
    }

    res.json({ success: true, data: { mappings: data.mappings, providers: simplified } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSources = async (req, res) => {
  try {
    const { anilistId, provider, category, episodeNum } = req.params;
    const aid = parseInt(anilistId, 10);
    const epNum = parseInt(episodeNum, 10);
    if (!aid || !provider || !epNum) {
      return res.status(400).json({ success: false, message: 'Missing params' });
    }

    const epData = await pipeFetch({
      path: 'episodes', method: 'GET',
      query: { anilistId: aid }, body: null, version: '0.1.0',
    });
    deepTranslateIds(epData);

    const provData = epData.providers?.[provider];
    if (!provData) return res.status(404).json({ success: false, message: `Provider ${provider} not found` });

    const epsList = provData.episodes?.[category || 'sub'] || [];
    const ep = epsList.find(e => e.number === epNum);
    if (!ep) return res.status(404).json({ success: false, message: `Episode ${epNum} not found` });

    const encId = Buffer.from(ep.id).toString('base64url').replace(/=+$/, '');
    const sources = await pipeFetch({
      path: 'sources', method: 'GET',
      query: { episodeId: encId, provider, category: category || 'sub', anilistId: aid },
      body: null, version: '0.1.0',
    });

    const hlsStreams = (sources.streams || []).filter(s => s.type === 'hls' && s.url);
    if (!hlsStreams.length) {
      return res.status(404).json({ success: false, message: 'No HLS streams found for this provider' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const proxied = hlsStreams.map(s => ({
      url: `${baseUrl}/api/stream/proxy?url=${encodeURIComponent(s.url)}&ref=${encodeURIComponent(s.referer || '')}`,
      quality: s.quality,
      isActive: s.isActive,
    }));

    res.json({
      success: true,
      data: {
        streams: proxied,
        subtitles: (sources.subtitles || []).map(s => ({ url: s.file || s.url, label: s.label || s.language })),
        intro: sources.intro || null,
        outro: sources.outro || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.autoSources = async (req, res) => {
  try {
    const { anilistId, episodeNum } = req.params;
    const category = req.query.cat || 'sub';
    const aid = parseInt(anilistId, 10);
    const epNum = parseInt(episodeNum, 10);
    if (!aid || !epNum) return res.status(400).json({ success: false, message: 'Missing params' });

    const epData = await pipeFetch({
      path: 'episodes', method: 'GET',
      query: { anilistId: aid }, body: null, version: '0.1.0',
    });
    deepTranslateIds(epData);

    const providers = epData.providers || {};
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    for (const pname of PROVIDER_PRIORITY) {
      const provData = providers[pname];
      if (!provData) continue;
      const epsList = provData.episodes?.[category] || [];
      const ep = epsList.find(e => e.number === epNum);
      if (!ep) continue;

      try {
        const encId = Buffer.from(ep.id).toString('base64url').replace(/=+$/, '');
        const sources = await pipeFetch({
          path: 'sources', method: 'GET',
          query: { episodeId: encId, provider: pname, category, anilistId: aid },
          body: null, version: '0.1.0',
        });

        const active = (sources.streams || []).find(s => s.type === 'hls' && s.url && s.isActive);
        const fallback = (sources.streams || []).find(s => s.type === 'hls' && s.url);
        const stream = active || fallback;
        if (!stream) continue;

        return res.json({
          success: true,
          data: {
            provider: pname,
            stream: {
              url: `${baseUrl}/api/stream/proxy?url=${encodeURIComponent(stream.url)}&ref=${encodeURIComponent(stream.referer || '')}`,
              quality: stream.quality,
            },
            subtitles: (sources.subtitles || []).map(s => ({ url: s.file || s.url, label: s.label || s.language })),
            intro: sources.intro || null,
            outro: sources.outro || null,
          },
        });
      } catch { continue; }
    }

    res.status(404).json({ success: false, message: 'No working stream found across all providers' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.streamProxy = async (req, res) => {
  try {
    const targetUrl = req.query.url;
    const referer = req.query.ref || '';
    if (!targetUrl) return res.status(400).send('url parameter required');

    const parsed = new URL(referer || targetUrl);
    const origin = `${parsed.protocol}//${parsed.host}`;
    const headers = {
      'User-Agent': PIPE_HEADERS['User-Agent'],
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': origin,
    };
    if (referer) headers['Referer'] = referer;

    const proxyRes = await fetch(targetUrl, { headers, timeout: 9000, redirect: 'follow' });
    if (!proxyRes.ok) return res.status(proxyRes.status).send('Upstream error');

    const contentType = proxyRes.headers.get('content-type') || '';
    const isM3U8 = targetUrl.endsWith('.m3u8') || contentType.includes('mpegurl');

    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');

    if (isM3U8) {
      let body = await proxyRes.text();
      const baseUrl = `${req.protocol}://${req.get('host')}/api/stream/proxy`;
      const urlDir = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

      body = body.replace(/(^(?!#).*$)/gm, (match) => {
        const line = match.trim();
        if (!line || line.startsWith('#')) return match;
        const abs = line.startsWith('http') ? line : urlDir + line;
        return `${baseUrl}?url=${encodeURIComponent(abs)}&ref=${encodeURIComponent(referer)}`;
      });

      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      return res.send(body);
    }

    res.set('Content-Type', contentType || 'application/octet-stream');
    proxyRes.body.pipe(res);
  } catch (err) {
    res.status(500).send('Proxy error');
  }
};

exports.testProviders = async (req, res) => {
  const results = {};
  try {
    const anilist = await anilistSearch('Death Note');
    results.anilist = { count: anilist.length, first: anilist[0]?.title || null };
  } catch (e) { results.anilist = { error: e.message }; }

  try {
    const data = await pipeFetch({
      path: 'episodes', method: 'GET',
      query: { anilistId: 1535 }, body: null, version: '0.1.0',
    });
    results.miruro = { providers: Object.keys(data.providers || {}) };
  } catch (e) { results.miruro = { error: e.message }; }

  res.json({ success: true, data: results });
};
