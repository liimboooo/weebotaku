const fetch = require('node-fetch');
const crypto = require('crypto');

const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID || '';
const MAL_CLIENT_SECRET = process.env.MAL_CLIENT_SECRET || '';
const MAL_REDIRECT_URI = process.env.MAL_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/sync/mal/callback`;
const JIKAN_BASE = 'https://api.jikan.moe/v4';
const MAL_TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';
const MAL_AUTH_URL = 'https://myanimelist.net/v1/oauth2/authorize';

function generateCodeChallenge() {
  const codeVerifier = crypto.randomBytes(32).toString('hex');
  const challenge = crypto.createHash('sha256').update(codeVerifier).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return { codeVerifier, codeChallenge: challenge };
}

function getAuthUrl() {
  const { codeVerifier, codeChallenge } = generateCodeChallenge();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: MAL_CLIENT_ID,
    code_challenge: codeChallenge,
    redirect_uri: MAL_REDIRECT_URI,
  });
  return { url: `${MAL_AUTH_URL}?${params.toString()}`, codeVerifier };
}

function getConnectUrl() {
  const { codeVerifier, codeChallenge } = generateCodeChallenge();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: MAL_CLIENT_ID,
    code_challenge: codeChallenge,
    redirect_uri: MAL_REDIRECT_URI,
    state: 'connect',
  });
  return { url: `${MAL_AUTH_URL}?${params.toString()}`, codeVerifier };
}

async function exchangeCode(code, codeVerifier) {
  const body = new URLSearchParams({
    client_id: MAL_CLIENT_ID,
    client_secret: MAL_CLIENT_SECRET,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: MAL_REDIRECT_URI,
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

async function getUserInfo(accessToken) {
  const res = await fetch('https://api.myanimelist.net/v2/users/@self', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch MAL user info');
  const data = await res.json();
  return { username: data.name, avatar: data.picture };
}

async function fetchAnimeList(accessToken) {
  let allAnime = [];
  let offset = 0;
  const limit = 500;
  let hasNext = true;

  while (hasNext) {
    const url = `https://api.myanimelist.net/v2/users/@self/animelist?limit=${limit}&offset=${offset}&fields=list_status,title,main_picture,media_type,num_episodes,average_epoch`;
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
    if (hasNext) await new Promise(r => setTimeout(r, 400));
  }
  return allAnime;
}

function mapMALStatus(status) {
  const map = {
    watching: 'Watching',
    completed: 'Completed',
    on_hold: 'On Hold',
    dropped: 'Dropped',
    plan_to_watch: 'Plan to Watch',
  };
  return map[status] || 'Watch Later';
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

module.exports = {
  getConnectUrl, getAuthUrl, exchangeCode, getUserInfo, getUserList,
  manualSync, revokeToken, fetchAnimeList,
};
