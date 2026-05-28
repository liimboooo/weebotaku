import { io } from 'socket.io-client';
import api from './api';

const SOCKET_URL = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : 'http://localhost:5000';

const IS_VERCEL = !!process.env.REACT_APP_API_URL;

let socket = null;
let pollTimer = null;

const friendStatusCache = {};

export function getFriendStatusCache() {
  return friendStatusCache;
}

// ─── Polling fallback (used on Vercel where WS doesn't work) ───

let polledRemoteUserId = null;

export function setPolledRemoteUserId(uid) {
  polledRemoteUserId = uid;
}

async function pollFriendStatus() {
  if (!polledRemoteUserId) return;
  try {
    const fs = await api.get(`/friends/status/${polledRemoteUserId}`);
    if (fs?.data) {
      window.dispatchEvent(new CustomEvent('friend-status-changed', {
        detail: { userId: polledRemoteUserId, status: fs.data.status, friendshipId: fs.data.friendshipId },
      }));
    }
  } catch {}
}

function startPollingFallback() {
  stopPollingFallback();
  pollFriendStatus();
  pollTimer = setInterval(pollFriendStatus, 10000);
}

function stopPollingFallback() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// ─── Socket.IO (used in local dev) ───

export function connectSocket() {
  if (IS_VERCEL) {
    startPollingFallback();
    return null;
  }

  if (socket?.connected) return socket;

  const token = localStorage.getItem('token');
  if (!token) return null;

  socket = io(SOCKET_URL, {
    path: '/api/socket',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,
  });

  socket.on('notification', (data) => {
    window.dispatchEvent(new CustomEvent('server-notification', { detail: data }));
  });

  socket.on('friend-status', (data) => {
    if (data?.userId) {
      friendStatusCache[data.userId] = { status: data.status, friendshipId: data.friendshipId };
    }
    window.dispatchEvent(new CustomEvent('friend-status-changed', { detail: data }));
  });

  socket.on('connect_error', () => {});
  socket.on('disconnect', () => {});

  return socket;
}

export function disconnectSocket() {
  stopPollingFallback();
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return IS_VERCEL ? null : socket;
}

export function joinAnimeRoom(animeId) {
  if (!IS_VERCEL && socket?.connected && animeId) {
    socket.emit('join-anime', animeId);
  }
}

export function leaveAnimeRoom(animeId) {
  if (!IS_VERCEL && socket?.connected && animeId) {
    socket.emit('leave-anime', animeId);
  }
}
