// Service Worker for Where My Money Went
// Handles push notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Where My Money Went', body: event.data ? event.data.text() : 'New notification' };
  }

  const title = data.title || 'Where My Money Went';
  const options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: data.data || {},
    actions: [
      { action: 'dismiss', title: 'Dismiss' },
      { action: 'remind', title: 'Remind me again' }
    ],
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'remind') {
    // Post message to client to snooze
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].postMessage({
            type: 'SNOOZE_NOTIFICATION',
            data: event.notification.data
          });
          clientList[0].focus();
        } else {
          clients.openWindow('/');
        }
      })
    );
  } else {
    // dismiss - just open app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].focus();
        } else {
          clients.openWindow('/');
        }
      })
    );
  }
});
