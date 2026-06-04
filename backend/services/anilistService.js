const fetch = require('node-fetch');
const { FRONTEND_URL, SYNC_BATCH_DELAY_MS, ANILIST_PER_PAGE } = require('../config/constants');

const ANILIST_CLIENT_ID = process.env.ANILIST_CLIENT_ID || '';
const ANILIST_CLIENT_SECRET = process.env.ANILIST_CLIENT_SECRET || '';
const ANILIST_CLIENT_ID_LOCAL = process.env.ANILIST_CLIENT_ID_LOCAL || '';
const ANILIST_CLIENT_SECRET_LOCAL = process.env.ANILIST_CLIENT_SECRET_LOCAL || '';
const ANILIST_AUTH_URL = 'https://anilist.co/api/v2/oauth/authorize';
const ANILIST_TOKEN_URL = 'https://anilist.co/api/v2/oauth/token';
const ANILIST_API = 'https://graphql.anilist.co';

function getCredentials(origin) {
  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    return { clientId: ANILIST_CLIENT_ID_LOCAL || ANILIST_CLIENT_ID, clientSecret: ANILIST_CLIENT_SECRET_LOCAL || ANILIST_CLIENT_SECRET };
  }
  return { clientId: ANILIST_CLIENT_ID, clientSecret: ANILIST_CLIENT_SECRET };
}

function getRedirectUri(origin) {
  return `${origin || FRONTEND_URL}/auth/sync/anilist/callback`;
}

function getAuthUrl(origin) {
  const { clientId } = getCredentials(origin);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(origin),
    response_type: 'code',
  });
  return `${ANILIST_AUTH_URL}?${params.toString()}`;
}

async function exchangeCode(code, origin) {
  const { clientId, clientSecret } = getCredentials(origin);
  const res = await fetch(ANILIST_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(origin),
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
  const clients = [
    { clientId: ANILIST_CLIENT_ID, clientSecret: ANILIST_CLIENT_SECRET },
    { clientId: ANILIST_CLIENT_ID_LOCAL, clientSecret: ANILIST_CLIENT_SECRET_LOCAL },
  ];
  for (const { clientId, clientSecret } of clients) {
    if (!clientId) continue;
    try {
      const res = await fetch(ANILIST_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in || 3600,
        expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
      };
    } catch {}
  }
  throw new Error('Failed to refresh AniList token');
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
  return { id: json.data.Viewer.id, username: json.data.Viewer.name, avatar: json.data.Viewer.avatar?.large || '' };
}

async function fetchAnimeList(accessToken, userId) {
  let allAnime = [];
  let hasNext = true;
  let page = 1;

  while (hasNext && page <= 10) {
    const query = `query($page:Int, $userId:Int) {
      Page(page:$page,perPage:${ANILIST_PER_PAGE}) {
        pageInfo { hasNextPage }
        mediaList(userId:$userId,type:ANIME) {
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
      body: JSON.stringify({ query, variables: { page, userId } }),
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
    if (hasNext) await new Promise(r => setTimeout(r, SYNC_BATCH_DELAY_MS));
  }
  return allAnime;
}

function mapAniListStatus(status) {
  const map = {
    CURRENT: 'Watching',
    COMPLETED: 'Completed',
    PLANNING: 'Planning',
    PAUSED: 'Paused',
    DROPPED: 'Dropped',
    REPEATING: 'Watching',
  };
  return map[status] || 'Planning';
}

async function manualSync(accessToken, userId) {
  return fetchAnimeList(accessToken, userId);
}

function reverseMapAniListStatus(localStatus) {
  const map = {
    'Watching': 'CURRENT',
    'Completed': 'COMPLETED',
    'Planning': 'PLANNING',
    'Paused': 'PAUSED',
    'Dropped': 'DROPPED',
  };
  return map[localStatus] || 'PLANNING';
}

async function saveMediaListEntry(accessToken, animeId, status, score = 0, progress = 0) {
  const anilistStatus = reverseMapAniListStatus(status);
  const query = `mutation($mediaId:Int, $status:MediaListStatus, $score:Float, $progress:Int) {
    SaveMediaListEntry(mediaId:$mediaId, status:$status, score:$score, progress:$progress) {
      id status score progress
    }
  }`;
  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query,
      variables: {
        mediaId: Number(animeId),
        status: anilistStatus,
        score: Number(score),
        progress: Number(progress),
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AniList save failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'AniList error');
  return json.data?.SaveMediaListEntry;
}

async function fetchFavorites(accessToken) {
  try {
    const query = `query { Viewer { favourites { anime { nodes { id idMal title { romaji english } coverImage { large } } } } } }`;
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.errors) return [];
    return (json.data?.Viewer?.favourites?.anime?.nodes || []).map(e => ({
      animeId: e.idMal || e.id,
      name: e.title?.english || e.title?.romaji,
      img: e.coverImage?.large || '',
    }));
  } catch {
    return [];
  }
}

async function updateFavorites(accessToken, favorites) {
  const results = [];
  for (const fav of favorites) {
    try {
      const query = `mutation($animeId: Int) { SaveMediaListEntry(mediaId: $animeId, status: CURRENT) { media { id } } }`;
      const res = await fetch(ANILIST_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query,
          variables: { animeId: Number(fav.animeId) },
        }),
      });
      const json = await res.json();
      results.push({ animeId: fav.animeId, success: !json.errors });
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      results.push({ animeId: fav.animeId, success: false, error: e.message });
    }
  }
  return results;
}

module.exports = {
  getAuthUrl, exchangeCode, refreshAccessToken, getUserInfo,
  manualSync, fetchAnimeList, saveMediaListEntry,
  fetchFavorites, updateFavorites,
};
