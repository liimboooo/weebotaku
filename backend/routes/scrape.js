const express = require('express');
const router = express.Router();

router.get('/animechan-proxy', async (req, res) => {
  try {
    const { path: animechanPath } = req.query;
    if (!animechanPath) {
      return res.status(400).json({ success: false, message: 'Missing path query param' });
    }
    const response = await fetch(`https://animechan.xyz${animechanPath}`);
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Animechan proxy error:', error.message);
    res.status(500).json({ success: false, message: 'Proxy fetch failed' });
  }
});

router.get('/waifu', async (req, res) => {
  try {
    const { category } = req.query;
    const cat = category || 'waifu';
    const response = await fetch(`https://api.waifu.pics/sfw/${cat}`);
    if (!response.ok) throw new Error(`Waifu API error: ${response.status}`);
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Waifu proxy error:', error.message);
    res.status(500).json({ success: false, message: 'Waifu fetch failed' });
  }
});

module.exports = router;
