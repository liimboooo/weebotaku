const fetch = require('node-fetch');

const ANILIST_URL = 'https://graphql.anilist.co';

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { large }
  bannerImage
  format
  episodes
  status
  season
  seasonYear
  averageScore
  popularity
  trending
  genres
  description(asHtml: false)
  startDate { year month day }
`;

async function anilistQuery(query, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message || 'AniList query failed');
  return data.data;
}

exports.getTrending = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = Math.min(parseInt(req.query.perPage) || 20, 50);

    const data = await anilistQuery(`
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { total currentPage lastPage hasNextPage }
          media(type: ANIME, sort: TRENDING_DESC) { ${MEDIA_FIELDS} }
        }
      }
    `, { page, perPage });

    res.json({ success: true, data: data.Page.media, pageInfo: data.Page.pageInfo });
  } catch (err) {
    console.error('GetTrending error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch trending' });
  }
};

exports.getSeasonal = async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();
    let season = req.query.season;

    if (!season) {
      if (month <= 3) season = 'WINTER';
      else if (month <= 6) season = 'SPRING';
      else if (month <= 9) season = 'SUMMER';
      else season = 'FALL';
    }

    const page = parseInt(req.query.page) || 1;
    const perPage = Math.min(parseInt(req.query.perPage) || 20, 50);

    const data = await anilistQuery(`
      query ($page: Int, $perPage: Int, $season: MediaSeason, $year: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { total currentPage lastPage hasNextPage }
          media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC) { ${MEDIA_FIELDS} }
        }
      }
    `, { page, perPage, season: season.toUpperCase(), year });

    res.json({
      success: true,
      data: data.Page.media,
      pageInfo: data.Page.pageInfo,
      season: season.toUpperCase(),
      year,
    });
  } catch (err) {
    console.error('GetSeasonal error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch seasonal' });
  }
};

exports.getUpcoming = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = Math.min(parseInt(req.query.perPage) || 20, 50);

    const data = await anilistQuery(`
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo { total currentPage lastPage hasNextPage }
          media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) { ${MEDIA_FIELDS} }
        }
      }
    `, { page, perPage });

    res.json({ success: true, data: data.Page.media, pageInfo: data.Page.pageInfo });
  } catch (err) {
    console.error('GetUpcoming error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming' });
  }
};
