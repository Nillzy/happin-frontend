/* Happin Service Worker — K4 Erinnerungen (Web Push). */

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (_e) {
        data = { title: 'Happin', body: event.data ? event.data.text() : '' };
    }
    const title = data.title || 'Happin Erinnerung';
    const options = {
        body: data.body || '',
        icon: '/favicon.png',
        badge: '/favicon.png',
        data: { eventId: data.eventId },
        tag: data.eventId ? `event-reminder-${data.eventId}` : undefined,
        renotify: false,
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const eventId = event.notification.data && event.notification.data.eventId;
    const targetUrl = eventId ? `/event?id=${eventId}` : '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                try {
                    const url = new URL(client.url);
                    if (url.pathname === '/' || url.pathname.startsWith('/event')) {
                        client.focus();
                        if ('navigate' in client) {
                            return client.navigate(targetUrl);
                        }
                        return;
                    }
                } catch (_e) {
                    /* ignore */
                }
            }
            return self.clients.openWindow(targetUrl);
        }),
    );
});
