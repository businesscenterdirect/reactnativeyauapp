/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications for YAU Admin Portal (Standalone)
 *
 * IMPORTANT: This file must be plain JavaScript (no ES modules / import).
 * It is served from the root of the app at /firebase-messaging-sw.js
 */

// Import Firebase compat SDKs via CDN importScripts (required in SW context)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ─── Firebase Config ───────────────────────────────────────────────────────────
// Must duplicate the config here — SW has no access to app bundle env vars
firebase.initializeApp({
  apiKey: 'AIzaSyCADG-9nm-61nmsHbe-hNlg82g0ccKpjkw',
  authDomain: 'yau-app.firebaseapp.com',
  projectId: 'yau-app',
  storageBucket: 'yau-app.firebasestorage.app',
  messagingSenderId: '696491882997',
  appId: '1:696491882997:web:c191283f1415b8e913c8bc',
});

const messaging = firebase.messaging();

// ─── Background Message Handler ────────────────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const notificationTitle =
    payload.notification?.title || payload.data?.title || 'YAU Admin';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new message.',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'yau-admin-notification',
    renotify: true,
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ─── Notification Click Handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = '/messaging';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an already-open window if possible
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
