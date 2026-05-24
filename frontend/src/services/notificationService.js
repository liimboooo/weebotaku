import api from './api';
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

export async function fetchNotificationsFromServer(filter = 'all', page = 1, limit = 50) {
  try {
    const params = new URLSearchParams({ filter, page, limit });
    const res = await api.get(`/notifications?${params}`);
    return res;
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    return { notifications: [], total: 0, unreadCount: 0 };
  }
}

export async function fetchUnreadCount() {
  try {
    const res = await api.get('/notifications/unread-count');
    return res.count || 0;
  } catch {
    return 0;
  }
}

export async function markReadOnServer(notificationId) {
  try {
    await api.put(`/notifications/${notificationId}/read`);
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
  }
}

export async function markAllReadOnServer() {
  try {
    await api.put('/notifications/mark-all-read');
  } catch (err) {
    console.error('Failed to mark all as read:', err);
  }
}

export async function deleteNotificationOnServer(notificationId) {
  try {
    await api.delete(`/notifications/${notificationId}`);
  } catch (err) {
    console.error('Failed to delete notification:', err);
  }
}

export async function clearAllOnServer() {
  try {
    await api.delete('/notifications/clear');
  } catch (err) {
    console.error('Failed to clear notifications:', err);
  }
}
