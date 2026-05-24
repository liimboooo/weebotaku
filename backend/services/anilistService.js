const fetch = require('node-fetch');

const ANILIST_CLIENT_ID = process.env.ANILIST_CLIENT_ID || '';
const ANILIST_CLIENT_SECRET = process.env.ANILIST_CLIENT_SECRET || '';
const ANILIST_REDIRECT_URI = process.env.ANILIST_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/sync/anilist/callback`;
const ANILIST_AUTH_URL = 'https://anilist.co/api/v2/oauth/authorize';
const ANILIST_TOKEN_URL = 'https://anilist.co/api/v2/oauth/token';
const ANILIST_API = 'https://graphql.anilist.co';

function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: ANILIST_CLIENT_ID,
    redirect_uri: ANILIST_REDIRECT_URI,
    response_type: 'code',
  });
  return `${ANILIST_AUTH_URL}?${params.toString()}`;
}

async function exchangeCode(code) {
  const res = await fetch(ANILIST_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: ANILIST_CLIENT_ID,
      client_secret: ANILIST_CLIENT_SECRET,
      redirect_uri: ANILIST_REDIRECT_URI,
      code,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AniList token exchange failed: ${err}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    expiresIn: data.expires_in || 3600,
    expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
  };
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch(ANILIST_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: ANILIST_CLIENT_ID,
      client_secret: ANILIST_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error('Failed to refresh AniList token');
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in || 3600,
    expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
  };
}

async function getUserInfo(accessToken) {
  const query = `query { Viewer { id name avatar { large medium } } }`;
  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error('Failed to fetch AniList user info');
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'AniList error');
  return { username: json.data.Viewer.name, avatar: json.data.Viewer.avatar?.large || '' };
}

async function fetchAnimeList(accessToken) {
  let allAnime = [];
  let hasNext = true;
  let page = 1;

  while (hasNext && page <= 10) {
    const query = `query($page:Int) {
      Page(page:$page,perPage:50) {
        pageInfo { hasNextPage }
        mediaList(userName:"__self__",type:ANIME) {
          media {
            id idMal title { romaji english }
            coverImage { large }
            episodes status
          }
          score status progress
        }
      }
    }`;
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query, variables: { page } }),
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('AniList token expired');
      throw new Error(`AniList API error: ${res.status}`);
    }
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0]?.message || 'AniList error');
    const entries = json.data?.Page?.mediaList || [];
    allAnime = allAnime.concat(entries.map(e => ({
      animeId: e.media?.idMal || e.media?.id,
      name: e.media?.title?.english || e.media?.title?.romaji || `AniList #${e.media?.id}`,
      img: e.media?.coverImage?.large || '',
      episodes: e.media?.episodes || 0,
      listStatus: mapAniListStatus(e.status),
      rating: e.score || 0,
      progress: e.progress || 0,
      type: 'anime',
    })));
    hasNext = json.data?.Page?.pageInfo?.hasNextPage && entries.length > 0;
    page++;
    if (hasNext) await new Promise(r => setTimeout(r, 400));
  }
  return allAnime;
}

function mapAniListStatus(status) {
  const map = {
    CURRENT: 'Watching',
    COMPLETED: 'Completed',
    PLANNING: 'Plan to Watch',
    PAUSED: 'On Hold',
    DROPPED: 'Dropped',
    REPEATING: 'Watching',
  };
  return map[status] || 'Watch Later';
}

async function manualSync(accessToken) {
  return fetchAnimeList(accessToken);
}

module.exports = {
  getAuthUrl, exchangeCode, refreshAccessToken, getUserInfo,
  manualSync, fetchAnimeList,
};
