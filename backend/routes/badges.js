const express = require('express');
const router = express.Router();

const BADGE_DEFS = process.env.BADGE_DEFS
  ? JSON.parse(process.env.BADGE_DEFS)
  : {
      Collector: { label: "Collector", desc: "10 anime in watchlist", icon: "Library", check: "watchlistCount >= 10" },
      "Hardcore Fan": { label: "Hardcore Fan", desc: "50 episodes watched", icon: "Flame", check: "episodesWatched >= 50" },
      "On Fire": { label: "On Fire", desc: "7-day streak", icon: "Zap", check: "streak >= 7" },
      Rater: { label: "Rater", desc: "10 anime rated", icon: "Star", check: "ratingCount >= 10" },
      Critic: { label: "Critic", desc: "50 anime rated", icon: "MessageSquare", check: "ratingCount >= 50" },
      Otaku: { label: "Otaku", desc: "Level 10", icon: "Gamepad2", check: "level >= 10" },
      Legend: { label: "Legend", desc: "Level 25", icon: "Trophy", check: "level >= 25" },
      Dedicated: { label: "Dedicated", desc: "30-day streak", icon: "Gem", check: "streak >= 30" },
      Loyal: { label: "Loyal", desc: "100 episodes watched", icon: "Crown", check: "episodesWatched >= 100" },
      Curator: { label: "Curator", desc: "25 anime in watchlist", icon: "FolderOpen", check: "watchlistCount >= 25" },
    };

router.get('/', (req, res) => {
  res.json({ success: true, data: BADGE_DEFS });
});

module.exports = router;
