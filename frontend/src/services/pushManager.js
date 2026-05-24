import api from './api';

let swRegistration = null;

async function getRegistration() {
  if (swRegistration) return swRegistration;
  if (!('serviceWorker' in navigator)) return null;
  swRegistration = await navigator.serviceWorker.register('/sw.js');
  return swRegistration;
}

export async function getVapidKey() {
  try {
    const res = await api.get('/notifications/vapid-key', { auth: false });
    return res.vapidPublicKey || null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function subscribeToPush() {
  const permitted = await requestPermission();
  if (!permitted) return null;

  const registration = await getRegistration();
  if (!registration) return null;

  const vapidKey = await getVapidKey();
  if (!vapidKey) {
    console.warn('No VAPID public key configured on server');
    return null;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const subJson = subscription.toJSON();
  await api.post('/notifications/push/subscribe', {
    endpoint: subJson.endpoint,
    keys: subJson.keys,
    userAgent: navigator.userAgent,
  });

  return subscription;
}

export async function unsubscribeFromPush() {
  const registration = await getRegistration();
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const subJson = subscription.toJSON();
  await subscription.unsubscribe();

  try {
    await api.post('/notifications/push/unsubscribe', {
      endpoint: subJson.endpoint,
    });
  } catch {}
}

export async function isSubscribed() {
  const registration = await getRegistration();
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  return subscription !== null;
}

export async function getPushStatus() {
  try {
    const res = await api.get('/notifications/push/status');
    return {
      subscribed: res.subscribed,
      deviceCount: res.deviceCount,
      vapidConfigured: !!res.vapidPublicKey,
    };
  } catch {
    return { subscribed: false, deviceCount: 0, vapidConfigured: false };
  }
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPermissionState() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function setupNotificationClickHandler(navigate) {
  if (!('serviceWorker' in navigator)) return () => {};

  const handler = (event) => {
    if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.link) {
      navigate(event.data.link);
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}
