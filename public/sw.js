/* Happin Service Worker — K4 Erinnerungen + In-App-Benachrichtigungen (Web Push). */

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
    console.log('[SW] push received:', JSON.stringify(data));
    const type = data.type || 'reminder';
    const title = data.title || 'Happin';
    const tag = data.eventId
        ? `${type}-${data.eventId}`
        : `${type}-${Date.now()}`;
    const options = {
        body: data.body || '',
        icon: '/favicon.png',
        badge: '/favicon.png',
        data: { eventId: data.eventId, type },
        tag,
        renotify: false,
    };
    event.waitUntil(
        Promise.all([
            self.registration.showNotification(title, options).then(
                () => console.log('[SW] showNotification ok:', title),
                (err) => console.error('[SW] showNotification failed:', err),
            ),
            self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
                for (const client of clients) {
                    client.postMessage({ kind: 'happin-notification', type, eventId: data.eventId });
                }
            }),
        ]),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const data = event.notification.data || {};
    const eventId = data.eventId;
    const type = data.type;
    let targetUrl;
    if (type === 'reminder' && eventId) {
        targetUrl = `/event?id=${eventId}`;
    } else if (eventId) {
        targetUrl = `/notifications`;
    } else {
        targetUrl = '/notifications';
    }
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                try {
                    client.focus();
                    if ('navigate' in client) {
                        return client.navigate(targetUrl);
                    }
                    return;
                } catch (_e) {
                    /* ignore */
                }
            }
            return self.clients.openWindow(targetUrl);
        }),
    );
});
