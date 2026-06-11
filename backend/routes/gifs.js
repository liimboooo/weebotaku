const { Router } = require('express');
const router = Router();

const GIPHY_KEY = process.env.GIPHY_API_KEY;
const TENOR_KEY = process.env.TENOR_API_KEY;
const GIPHY_URL = 'https://api.giphy.com/v1/gifs';
const TENOR_URL = 'https://tenor.googleapis.com/v2';

async function fetchJson(url, opts) {
  const r = await fetch(url, opts);
  return { ok: r.ok, status: r.status, data: await r.json() };
}

router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    if (TENOR_KEY) {
      const { ok, data: d } = await fetchJson(`${TENOR_URL}/featured?key=${TENOR_KEY}&limit=${limit}&contentfilter=high`);
      if (ok && d.results?.length) return res.json({ data: d.results.map(mapTenor) });
    }

    if (GIPHY_KEY && GIPHY_KEY !== 'your_giphy_api_key_here') {
      const { ok, data: d } = await fetchJson(`${GIPHY_URL}/trending?api_key=${GIPHY_KEY}&limit=${limit}&rating=g`);
      if (ok && d.data?.length) return res.json({ data: d.data.map(mapGiphy) });
      if (d.meta?.status === 403 || d.meta?.status === 401) {
        return res.status(502).json({ error: 'GIPHY key invalid. Set GIPHY_API_KEY or TENOR_API_KEY in backend/.env' });
      }
    }

    res.status(400).json({ error: 'No GIF API key configured. Get a free Tenor key → https://developers.google.com/tenor' });
  } catch (e) {
    res.status(502).json({ error: 'Failed to load GIFs' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const limit = parseInt(req.query.limit) || 20;
    if (!q) return res.json({ data: [] });

    if (TENOR_KEY) {
      const { ok, data: d } = await fetchJson(`${TENOR_URL}/search?key=${TENOR_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&contentfilter=high`);
      if (ok && d.results?.length) return res.json({ data: d.results.map(mapTenor) });
    }

    if (GIPHY_KEY && GIPHY_KEY !== 'your_giphy_api_key_here') {
      const { ok, data: d } = await fetchJson(`${GIPHY_URL}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=g`);
      if (ok && d.data?.length) return res.json({ data: d.data.map(mapGiphy) });
      if (d?.meta?.status === 403 || d?.meta?.status === 401) {
        return res.status(502).json({ error: 'GIPHY key invalid. Set GIPHY_API_KEY or TENOR_API_KEY in backend/.env' });
      }
    }

    res.status(400).json({ error: 'No GIF API key configured. Get a free Tenor key → https://developers.google.com/tenor' });
  } catch (e) {
    res.status(502).json({ error: 'Failed to search GIFs' });
  }
});

function mapTenor(item) {
  const gif = item.media_formats?.gif || {};
  const tiny = item.media_formats?.tinygif || {};
  const med = item.media_formats?.mediumgif || {};
  return {
    id: item.id,
    title: item.title || '',
    images: {
      fixed_height: { url: gif.url || med.url || '' },
      fixed_height_small: { url: tiny.url || gif.url || '' },
      original: { url: gif.url || med.url || '' },
    },
  };
}

function mapGiphy(item) {
  return {
    id: item.id,
    title: item.title || '',
    images: item.images || {},
  };
}

module.exports = router;
