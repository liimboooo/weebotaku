const express = require('express');
const router = express.Router();

function parseJSON(val, fallback) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

const RULES = parseJSON(process.env.SITE_RULES, []);
const FEATURES = parseJSON(process.env.SITE_FEATURES, []);

router.get('/rules', (req, res) => {
  res.json({ success: true, data: RULES });
});

router.get('/features', (req, res) => {
  res.json({ success: true, data: FEATURES });
});

module.exports = router;
