const fetch = require('node-fetch');

const ANILIST = process.env.ANILIST_API_URL || 'https://graphql.anilist.co';

async function gql(query, variables = {}, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(ANILIST, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        timeout: 10000,
      });
      if (r.status === 429) {
        const wait = Math.min((attempt + 1) * 1500, 5000);
        await new Promise(res => setTimeout(res, wait));
        continue;
      }
      if (!r.ok) {
        if (attempt < retries) { await new Promise(res => setTimeout(res, 1000)); continue; }
        throw new Error(`AniList HTTP ${r.status}`);
      }
      const j = await r.json();
      if (j.errors) throw new Error(j.errors[0]?.message || 'AniList error');
      return j.data;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) { await new Promise(res => setTimeout(res, 1000)); continue; }
      throw lastErr;
    }
  }
  throw lastErr || new Error('AniList request failed');
}

function stripHtml(html) { if (!html) return ''; return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim(); }

function mapSimple(a) {
  return {
    id: a.id,
    malId: a.idMal,
    title: a.title?.english || a.title?.romaji || '',
    image: a.coverImage?.large || a.coverImage?.extraLarge || '',
    banner: a.bannerImage || '',
    rating: (a.averageScore || 0) / 10,
    episodes: a.episodes || 0,
    genres: a.genres || [],
  };
}

const VIDEO_VIEWS = new Map();

exports.getWatch = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });

    const q = `query($id:Int){Media(id:$id,type:ANIME){id idMal title{romaji english native}coverImage{large extraLarge}bannerImage averageScore popularity episodes genres description trailer{site id} }}`;
    const data = await gql(q, { id });
    if (!data?.Media) return res.status(404).json({ success: false, message: 'Anime not found' });

    const media = data.Media;
    const info = {
      id: media.id,
      malId: media.idMal,
      title: media.title?.english || media.title?.romaji || '',
      image: media.coverImage?.extraLarge || media.coverImage?.large || '',
      banner: media.bannerImage || '',
      rating: (media.averageScore || 0) / 10,
      popularity: media.popularity || 0,
      episodes: media.episodes || 0,
      genres: media.genres || [],
      synopsis: stripHtml(media.description).slice(0, 1000),
      trailerUrl: media.trailer?.site === 'youtube' ? `https://www.youtube.com/watch?v=${media.trailer.id}` : null,
      views: VIDEO_VIEWS.get(media.id) || Math.floor((media.popularity || 1000) / 2),
    };

    // recommendations
    const rq = `query($id:Int){Media(id:$id,type:ANIME){recommendations(page:1,perPage:12){edges{node{rating mediaRecommendation{id title{romaji english}coverImage{large extraLarge}averageScore format episodes genres}}}}}}`;
    const rdata = await gql(rq, { id });
    const recs = (rdata?.Media?.recommendations?.edges || [])
      .filter(e => e.node?.mediaRecommendation)
      .map(e => mapSimple(e.node.mediaRecommendation));

    res.json({ success: true, data: { info, recommendations: recs } });
  } catch (err) {
    console.error('getWatch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.incrementViews = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const cur = VIDEO_VIEWS.get(id) || 0;
    VIDEO_VIEWS.set(id, cur + 1);
    res.json({ success: true, views: VIDEO_VIEWS.get(id) });
  } catch (err) {
    console.error('incrementViews error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
