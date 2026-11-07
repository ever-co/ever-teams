/*
 * The inbox's push worker. A push carries one inbox entry of the signed-in person (title, text, the entry's id, a tag
 * so a device shows one notification per entry); the worker shows it, and a click opens the entry in the Inbox —
 * focusing an open tab of the app when there is one.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
	let payload = {};
	try {
		payload = event.data ? event.data.json() : {};
	} catch (error) {
		payload = { title: event.data ? event.data.text() : '' };
	}
	const title = payload.title || 'Inbox';
	const options = {
		body: payload.body || '',
		tag: payload.tag || undefined,
		icon: '/assets/ever-teams.png',
		badge: '/assets/ever-teams.png',
		data: { itemId: payload.itemId || null }
	};
	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const itemId = event.notification.data && event.notification.data.itemId;
	const target = new URL(itemId ? '/inbox?item=' + encodeURIComponent(itemId) : '/inbox', self.location.origin).href;
	event.waitUntil(
		(async () => {
			const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
			for (const client of windows) {
				if (new URL(client.url).origin !== self.location.origin) continue;
				try {
					const focused = await client.focus();
					if (focused && 'navigate' in focused) await focused.navigate(target);
					return;
				} catch (error) {
					// A tab this worker does not control cannot be steered: a new one opens below.
				}
			}
			await self.clients.openWindow(target);
		})()
	);
});
