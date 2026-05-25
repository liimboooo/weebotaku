import { STORAGE_KEYS } from '../utils/constants';
import api from './api';

const STORAGE_KEY = STORAGE_KEYS.NOTIFICATIONS;
const BROADCAST_KEY = 'animewch_broadcast_seen';
let counter = Date.now();
let serverNotifs = [];

const BROADCAST_NOTIFS = [
  {
    title: 'Welcome to AnimeWch!',
    body: 'Explore thousands of anime and manga. Start your journey today.',
    type: 'system_update',
    link: '/browse/anime',
  },
  {
    title: 'New: Watch Together Rooms',
    body: 'Sync up with friends and watch anime in real-time.',
    type: 'new_feature',
    link: '/watch-together',
  },
  {
    title: 'Community Feeds Are Live',
    body: 'Share AMVs, edits, and discuss your favorite series.',
    type: 'new_feature',
    link: '/feeds/amvs',
  },
  {
    title: 'Profile Customization',
    body: 'Set a status message, avatar, and show off your watch history.',
    type: 'system_update',
    link: '/settings',
  },
  {
    title: 'The Arena — Tier Lists',
    body: 'Create and share anime tier lists with the community.',
    type: 'new_feature',
    link: '/arena/tier-lists',
  },
];

const NOTIF_TYPE_SETTING_MAP = {
  trailer: 'newsNotifications',
  trending: 'newsNotifications',
  episode: ['newsNotifications', 'newEpisodeAlerts', 'newEpisodes'],
  comment_reply: ['communityActivity', 'commentReplies'],
  comment_like: 'communityActivity',
  review_like: 'communityActivity',
  friend_request: 'friendRequests',
  friend_accepted: 'friendsActivity',
  friend_online: 'friendsActivity',
  system_update: 'systemUpdates',
  new_feature: 'newFeatures',
  recommendation: ['weeklyRecs', 'animeRecs'],
};

function isNotifTypeEnabled(n, settings) {
  if (!settings) return true;
  const keys = NOTIF_TYPE_SETTING_MAP[n.type];
  if (keys) {
    if (settings.pushNotifs === false) return false;
    const arr = Array.isArray(keys) ? keys : [keys];
    if (arr.some(k => settings[k] === false)) return false;
  }
  return true;
}

function getLocalAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocal(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function mapServerNotif(n) {
  return {
    id: `srv-${n._id}`,
    title: n.title,
    body: n.body || '',
    type: n.type,
    link: n.link,
    time: new Date(n.createdAt).getTime(),
    read: n.read,
    fromUser: n.fromUser,
    _server: true,
  };
}

function getAllMerged() {
  const local = getLocalAll();
  const server = serverNotifs.map(mapServerNotif);
  return [...server, ...local].sort((a, b) => b.time - a.time);
}

export function seedBroadcastNotifications() {
  try {
    if (localStorage.getItem(BROADCAST_KEY)) return;
    const list = getLocalAll();
    const now = Date.now();
    BROADCAST_NOTIFS.forEach((b, i) => {
      list.unshift({
        id: ++counter,
        title: b.title,
        body: b.body,
        type: b.type,
        link: b.link,
        time: now + i,
        read: false,
      });
    });
    saveLocal(list);
    localStorage.setItem(BROADCAST_KEY, '1');
  } catch {}
}

let seenServerIds = new Set();
let pollTimer = null;

export async function fetchServerNotifications() {
  try {
    const res = await api.get('/notifications');
    if (res?.success && Array.isArray(res.data)) {
      const prevIds = seenServerIds;
      serverNotifs = res.data;

      seenServerIds = new Set(serverNotifs.map(n => n._id));

      for (const n of serverNotifs) {
        if (!n.read && !prevIds.has(n._id)) {
          window.dispatchEvent(new CustomEvent("notification-added", {
            detail: { message: n.title, type: "info" },
          }));
        }
      }
    }
  } catch {}
}

export function startPolling(interval = 30000) {
  stopPolling();
  pollTimer = setInterval(fetchServerNotifications, interval);
}

export function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

export function getNotifications(settings) {
  const all = getAllMerged();
  if (!settings) return all;
  return all.filter(n => isNotifTypeEnabled(n, settings));
}

export function getUnreadCount(settings) {
  const all = getAllMerged();
  if (!settings) return all.filter(n => !n.read).length;
  return all.filter(n => !n.read && isNotifTypeEnabled(n, settings)).length;
}

export function addNotification({ title, body, type = "info", link = null }) {
  const list = getLocalAll();
  const notif = {
    id: ++counter,
    title,
    body,
    type,
    link,
    time: Date.now(),
    read: false,
  };
  list.unshift(notif);
  saveLocal(list);
  window.dispatchEvent(new CustomEvent("notification-added", { detail: notif }));
  return notif;
}

export async function markRead(id) {
  if (typeof id === 'string' && id.startsWith('srv-')) {
    try {
      await api.put(`/notifications/read/${id.replace('srv-', '')}`);
      const n = serverNotifs.find(n => `srv-${n._id}` === id);
      if (n) n.read = true;
    } catch {}
  } else {
    const list = getLocalAll();
    const n = list.find(i => i.id === id);
    if (n) { n.read = true; saveLocal(list); }
  }
  window.dispatchEvent(new CustomEvent("notification-added", { detail: {} }));
}

export async function markAllRead() {
  try {
    await api.put('/notifications/read-all');
    serverNotifs.forEach(n => n.read = true);
  } catch {}
  const list = getLocalAll();
  list.forEach(n => n.read = true);
  saveLocal(list);
  window.dispatchEvent(new CustomEvent("notification-added", { detail: {} }));
}

export async function clearNotifications() {
  try {
    await api.delete('/notifications');
    serverNotifs = [];
  } catch {}
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("notification-added", { detail: {} }));
}

export { isNotifTypeEnabled };
