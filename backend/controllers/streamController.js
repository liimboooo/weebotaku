const axios = require('axios');
const cheerio = require('cheerio');
const CryptoJS = require('crypto-js');

const KUUDERE_API = 'https://kuudere.to/api';
const ZENCLOUD_BASE = 'https://zencloudz.cc';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

let searchCache = new Map();

async function kuudereSearch(query) {
  if (searchCache.has(query)) return searchCache.get(query);
  if (searchCache.size > 200) searchCache.clear();

  const { data } = await axios.get(`${KUUDERE_API}/search`, {
    params: { q: query },
    headers: { 'User-Agent': UA },
    timeout: 8000,
  });

  if (data.success && data.results?.length > 0) {
    searchCache.set(query, data.results);
    return data.results;
  }
  return [];
}

async function kuudereGetEpisodeLinks(animeId, episode) {
  const { data } = await axios.get(`${KUUDERE_API}/watch/${animeId}/${episode}`, {
    headers: { 'User-Agent': UA },
    timeout: 8000,
  });

  if (!data.success || !data.episode_links?.length) return null;
  return data.episode_links.filter(l => l.serverName.toLowerCase() === 'zen' && l.dataType === 'sub');
}

function extractEmbeddedData(html) {
  const $ = cheerio.load(html);
  let scriptContent = '';
  $('script').each((_, el) => {
    const content = $(el).html();
    if (content?.includes('__sveltekit_')) {
      scriptContent = content;
      return false;
    }
  });
  if (!scriptContent) return null;

  const match = scriptContent.match(/data:\s*\[null,null,\{type:"data",data:(\{[\s\S]*?\}),uses:/);
  if (!match) return null;

  try {
    return new Function(`return ${match[1]}`)();
  } catch { return null; }
}

function generateFieldMapping(seed) {
  const hash = CryptoJS.SHA256(seed).toString();
  return {
    videoField: `vf_${hash.substring(0, 8)}`,
    keyField: `kf_${hash.substring(8, 16)}`,
    ivField: `ivf_${hash.substring(16, 24)}`,
    containerName: `cd_${hash.substring(24, 32)}`,
    arrayName: `ad_${hash.substring(32, 40)}`,
    objectName: `od_${hash.substring(40, 48)}`,
    tokenField: `${hash.substring(48, 64)}_${hash.substring(56, 64)}`,
  };
}

function extractEncryptedData(obfData, mapping) {
  const container = obfData[mapping.containerName];
  if (!container) return null;
  const arr = container[mapping.arrayName];
  if (!arr?.length) return null;
  const obj = arr[0][mapping.objectName];
  if (!obj) return null;

  return {
    video_b64: obj[mapping.videoField],
    key_b64: obj[mapping.keyField],
    iv_b64: obj[mapping.ivField],
  };
}

async function zencloudGetSources(embedUrl) {
  const { data: html } = await axios.get(embedUrl, {
    headers: { 'User-Agent': UA },
    timeout: 8000,
  });

  const extracted = extractEmbeddedData(html);
  if (!extracted?.obfuscated_crypto_data || !extracted?.obfuscation_seed) return null;

  const mapping = generateFieldMapping(extracted.obfuscation_seed);
  const encrypted = extractEncryptedData(extracted.obfuscated_crypto_data, mapping);
  if (!encrypted?.key_b64 || !encrypted?.iv_b64) return null;

  let authToken = null;
  for (const [key, value] of Object.entries(extracted)) {
    if (key === mapping.tokenField && typeof value === 'string' && value.length > 0) {
      authToken = value;
      break;
    }
  }
  if (!authToken) return null;

  const tokenResp = await axios.get(`${ZENCLOUD_BASE}/api/m3u8/${authToken}`, {
    headers: { 'User-Agent': UA },
    timeout: 8000,
  });
  if (!tokenResp.data?.video_b64) return null;

  const key = CryptoJS.enc.Base64.parse(encrypted.key_b64);
  const iv = CryptoJS.enc.Base64.parse(encrypted.iv_b64);
  const encVideoUrl = CryptoJS.enc.Base64.parse(tokenResp.data.video_b64);

  let decryptedUrl;
  try {
    const decrypted = CryptoJS.AES.decrypt(encVideoUrl.toString(), key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    decryptedUrl = decrypted.toString(CryptoJS.enc.Utf8);
  } catch {}

  if (!decryptedUrl) {
    try {
      const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: encVideoUrl });
      const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      decryptedUrl = decrypted.toString(CryptoJS.enc.Utf8);
    } catch {}
  }

  if (!decryptedUrl?.trim()) return null;

  return {
    url: decryptedUrl,
    subtitles: extracted.subtitles || [],
    thumbnails: extracted.thumbnails_vtt || null,
  };
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

    const results = await kuudereSearch(decodedTitle);
    debug.searchResults = results.length;
    if (!results.length) {
      return res.status(404).json({ success: false, message: 'Anime not found on Kuudere', debug });
    }

    const animeId = results[0].id;
    debug.animeId = animeId;

    const links = await kuudereGetEpisodeLinks(animeId, ep);
    debug.zenLinks = links?.length || 0;
    if (!links?.length) {
      return res.status(404).json({ success: false, message: 'No Zen server links for this episode', debug });
    }

    for (const link of links) {
      try {
        const sources = await zencloudGetSources(link.dataLink);
        if (sources?.url) {
          return res.json({
            success: true,
            data: {
              sources: [{ url: sources.url, quality: 'auto', isM3U8: sources.url.includes('.m3u8') }],
              subtitles: (sources.subtitles || []).map(s => ({ url: s.url, lang: s.language })),
              provider: 'kuudere',
            },
          });
        }
      } catch (e) {
        debug.zenError = e.message;
      }
    }

    res.status(404).json({ success: false, message: 'Could not extract stream', debug });
  } catch (error) {
    console.error('GetStream error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.testProviders = async (req, res) => {
  const results = {};
  try {
    const resp = await axios.get(`${KUUDERE_API}/search`, {
      params: { q: 'Death Note' },
      headers: { 'User-Agent': UA },
      timeout: 8000,
    });
    results.search = { status: resp.status, count: resp.data?.results?.length || 0, first: resp.data?.results?.[0] || null };
  } catch (e) { results.search = { error: e.message }; }

  try {
    const resp = await axios.get(`${ZENCLOUD_BASE}`, { headers: { 'User-Agent': UA }, timeout: 5000 });
    results.zencloud = { status: resp.status, length: resp.data?.length || 0 };
  } catch (e) { results.zencloud = { error: e.code || e.message }; }

  res.json({ success: true, data: results });
};
