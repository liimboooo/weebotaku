const fetch = require('node-fetch');
const crypto = require('crypto');
const { FRONTEND_URL, SYNC_BATCH_DELAY_MS, MAL_LIST_LIMIT } = require('../config/constants');

const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID || '';
const MAL_CLIENT_SECRET = process.env.MAL_CLIENT_SECRET || '';
const MAL_TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';
const MAL_AUTH_URL = 'https://myanimelist.net/v1/oauth2/authorize';

const MAL_REDIRECT_URI = process.env.MAL_REDIRECT_URI || `${FRONTEND_URL}/auth/sync/mal/callback`;

function getRedirectUri(origin) {
  if (origin) {
    const uri = `${origin}/auth/sync/mal/callback`;
    if (uri !== MAL_REDIRECT_URI) {
      console.warn(`[MAL] Using dynamic redirect URI: ${uri} (registered: ${MAL_REDIRECT_URI})`);
    }
    return uri;
  }
  return MAL_REDIRECT_URI;
}

function generateCodeChallenge() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  return { codeVerifier, codeChallenge: codeVerifier };
}

function getAuthUrl(origin) {
  const { codeVerifier, codeChallenge } = generateCodeChallenge();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: MAL_CLIENT_ID,
    code_challenge: codeChallenge,
    redirect_uri: getRedirectUri(origin),
  });
  return { url: `${MAL_AUTH_URL}?${params.toString()}`, codeVerifier };
}

function getConnectUrl(origin) {
  const { codeVerifier, codeChallenge } = generateCodeChallenge();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: MAL_CLIENT_ID,
    code_challenge: codeChallenge,
    redirect_uri: getRedirectUri(origin),
    state: 'connect',
  });
  return { url: `${MAL_AUTH_URL}?${params.toString()}`, codeVerifier };
}

async function exchangeCode(code, codeVerifier, origin) {
  const body = new URLSearchParams({
    client_id: MAL_CLIENT_ID,
    client_secret: MAL_CLIENT_SECRET,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: getRedirectUri(origin),
  });
  const res = await fetch(MAL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MAL token exchange failed: ${err}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
    expiresIn: data.expires_in || 3600,
    expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
  };
}

async function getUserInfo(token) {
  const url = 'https://api.myanimelist.net/v2/users/@me';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch MAL user info (${res.status}): ${text}`);
  }
  const data = await res.json();
  return { username: data.name, avatar: data.picture || '' };
}

async function fetchAnimeList(accessToken) {
  let allAnime = [];
  let offset = 0;
  const limit = MAL_LIST_LIMIT;
  let hasNext = true;

  while (hasNext) {
    const base = 'https://api.myanimelist.net/v2/users/@me/animelist';
    const url = `${base}?limit=${limit}&offset=${offset}&fields=list_status,title,main_picture,media_type,num_episodes,average_epoch`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('MAL token expired');
      throw new Error(`MAL API error: ${res.status}`);
    }
    const data = await res.json();
    const entries = data.data || [];
    allAnime = allAnime.concat(entries.map(e => ({
      animeId: e.node?.id,
      name: e.node?.title || `MAL #${e.node?.id}`,
      img: e.node?.main_picture?.large || e.node?.main_picture?.medium || '',
      episodes: e.node?.num_episodes || 0,
      listStatus: mapMALStatus(e.list_status?.status),
      rating: e.list_status?.score || 0,
      progress: e.list_status?.num_episodes_watched || 0,
      type: 'anime',
    })));
    hasNext = data.paging?.next && entries.length > 0;
    offset += limit;
    if (hasNext) await new Promise(r => setTimeout(r, SYNC_BATCH_DELAY_MS));
  }
  return allAnime;
}

function mapMALStatus(status) {
  const map = {
    watching: 'Watching',
    completed: 'Completed',
    on_hold: 'Paused',
    dropped: 'Dropped',
    plan_to_watch: 'Planning',
  };
  return map[status] || 'Planning';
}

async function manualSync(accessToken) {
  const list = await fetchAnimeList(accessToken);
  return list;
}

async function getUserList(accessToken) {
  return fetchAnimeList(accessToken);
}

async function revokeToken(accessToken) {
  try {
    const body = new URLSearchParams({
      client_id: MAL_CLIENT_ID,
      client_secret: MAL_CLIENT_SECRET,
      token: accessToken,
      token_type_hint: 'access_token',
    });
    await fetch('https://myanimelist.net/v1/oauth2/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch {}
}

function reverseMapStatus(localStatus) {
  const map = {
    'Watching': 'watching',
    'Completed': 'completed',
    'Paused': 'on_hold',
    'Dropped': 'dropped',
    'Planning': 'plan_to_watch',
  };
  return map[localStatus] || 'plan_to_watch';
}

async function updateAnimeList(accessToken, animeId, status, score = 0, numEpisodesWatched = 0) {
  const malStatus = reverseMapStatus(status);
  const body = new URLSearchParams({
    status: malStatus,
    score: String(score),
    num_watched_episodes: String(numEpisodesWatched),
  });
  const res = await fetch(`https://api.myanimelist.net/v2/anime/${animeId}/my_list_status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`MAL update failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: MAL_CLIENT_ID,
    client_secret: MAL_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch(MAL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`MAL token refresh failed: ${text}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in || 3600,
    expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
  };
}

async function fetchFavorites(accessToken) {
  try {
    const res = await fetch('https://api.myanimelist.net/v2/users/@me/favorites', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.anime || []).map(e => ({
      animeId: e.node?.id,
      name: e.node?.title,
      img: e.node?.main_picture?.large || e.node?.main_picture?.medium || '',
    }));
  } catch {
    return [];
  }
}

async function updateFavorites(accessToken, favorites) {
  const results = [];
  for (const fav of favorites) {
    try {
      const res = await fetch(`https://api.myanimelist.net/v2/anime/${fav.animeId}/favorite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok || res.status === 400) {
        results.push({ animeId: fav.animeId, success: res.ok });
      }
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      results.push({ animeId: fav.animeId, success: false, error: e.message });
    }
  }
  return results;
}

module.exports = {
  getConnectUrl, exchangeCode, getUserInfo, getUserList,
  manualSync, revokeToken, fetchAnimeList, updateAnimeList, refreshAccessToken,
  fetchFavorites, updateFavorites,
};
