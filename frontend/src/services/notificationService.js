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

export function getNotifications() {
  return getLocalAll().sort((a, b) => b.time - a.time);
}

export function getUnreadCount() {
  return getLocalAll().filter(n => !n.read).length;
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
