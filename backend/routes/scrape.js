const express = require('express');
const router = express.Router();

const SCRAPE_TIMEOUT = 20000;

async function fetchWithWreq(url) {
  try {
    const wreq = require('wreq-js');
    const response = await wreq.fetch(url, { timeout: SCRAPE_TIMEOUT });
    if (response.status === 200) {
      const text = await response.text();
      return text || null;
    }
    return null;
  } catch {
    return null;
  }
}

router.get('/fetch', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ success: false, message: 'Missing url query param' });
  }

  const html = await fetchWithWreq(url);

  if (html) {
    res.json({ success: true, data: html });
  } else {
    res.status(502).json({ success: false, message: 'Failed to fetch URL' });
  }
});

module.exports = router;
