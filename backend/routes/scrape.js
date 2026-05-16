const express = require('express');
const router = express.Router();

const SCRAPE_TIMEOUT = 15000;

router.get('/fetch', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, message: 'Missing url query param' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SCRAPE_TIMEOUT);
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: `Upstream returned ${response.status}` });
    }

    const text = await response.text();
    res.json({ success: true, data: text });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ success: false, message: 'Upstream timeout' });
    }
    res.status(502).json({ success: false, message: err.message });
  }
});

module.exports = router;
