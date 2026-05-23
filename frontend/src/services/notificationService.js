import { STORAGE_KEYS } from '../utils/constants';
const STORAGE_KEY = STORAGE_KEYS.NOTIFICATIONS;

let counter = Date.now();

function getAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getNotifications() {
  return getAll().sort((a, b) => b.time - a.time);
}

export function getUnreadCount() {
  return getAll().filter(n => !n.read).length;
}

export function addNotification({ title, body, type = "info", link = null }) {
  const list = getAll();
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
  save(list);
  window.dispatchEvent(new CustomEvent("notification-added", { detail: notif }));
  return notif;
}

export function markRead(id) {
  const list = getAll();
  const n = list.find(i => i.id === id);
  if (n) { n.read = true; save(list); }
}

export function markAllRead() {
  const list = getAll();
  list.forEach(n => n.read = true);
  save(list);
}

export function clearNotifications() {
  localStorage.removeItem(STORAGE_KEY);
}

