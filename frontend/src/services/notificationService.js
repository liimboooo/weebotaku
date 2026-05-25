import { STORAGE_KEYS } from '../utils/constants';

const STORAGE_KEY = STORAGE_KEYS.NOTIFICATIONS;
let counter = Date.now();

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

const NOTIF_TYPE_SETTING_MAP = {
  trailer: 'newsNotifications',
  trending: 'newsNotifications',
  episode: ['newsNotifications', 'newEpisodeAlerts'],
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

export function getNotifications(settings) {
  const all = getLocalAll().sort((a, b) => b.time - a.time);
  if (!settings) return all;
  return all.filter(n => isNotifTypeEnabled(n, settings));
}

export function getUnreadCount(settings) {
  const all = getLocalAll();
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

export function markRead(id) {
  const list = getLocalAll();
  const n = list.find(i => i.id === id);
  if (n) { n.read = true; saveLocal(list); }
}

export function markAllRead() {
  const list = getLocalAll();
  list.forEach(n => n.read = true);
  saveLocal(list);
}

export function clearNotifications() {
  localStorage.removeItem(STORAGE_KEY);
}
