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

module.exports = router;
