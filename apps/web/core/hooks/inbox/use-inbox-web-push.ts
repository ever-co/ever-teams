'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { inboxPushService, type IInboxPushDevice } from '@/core/services/client/api/inbox';
import {
	base64UrlToBytes,
	sortPushDevices,
	supportsWebPush,
	thisBrowserPushSubscription,
	unsubscribeThisBrowserPush
} from '@/core/lib/utils/web-push';

/** The worker that shows pushed inbox entries (served from `public/`). */
const INBOX_PUSH_WORKER_URL = '/inbox-push-sw.js';

/**
 * Where this browser stands: `unavailable` (the platform has web push off), `unsupported` (the browser cannot),
 * `blocked` (the person refused notifications for the site), `off`, `on`, `loading`.
 */
type InboxWebPushState = 'loading' | 'unavailable' | 'unsupported' | 'blocked' | 'off' | 'on';

async function currentSubscription(): Promise<PushSubscription | null> {
	const registration = await navigator.serviceWorker.getRegistration('/');
	return (await registration?.pushManager.getSubscription()) ?? null;
}

/**
 * Signing out on this browser: the device is removed from the platform while the session still allows it, and the
 * browser unsubscribes, so the next person on a shared browser never receives the previous one's inbox. Never
 * throws; the caller bounds how long it waits.
 */
export async function forgetThisBrowserPush(): Promise<void> {
	if (!supportsWebPush()) return;
	try {
		const subscription = await currentSubscription();
		if (!subscription) return;
		const devices = await inboxPushService.devices().catch(() => []);
		const device = devices.find((candidate) => candidate.endpoint === subscription.endpoint);
		if (device) await inboxPushService.remove(device.id).catch(() => undefined);
	} finally {
		await unsubscribeThisBrowserPush();
	}
}

function deviceInputOf(subscription: PushSubscription) {
	const json = subscription.toJSON();
	return {
		endpoint: String(json.endpoint ?? subscription.endpoint),
		keys: { p256dh: String(json.keys?.['p256dh'] ?? ''), auth: String(json.keys?.['auth'] ?? '') },
		expirationTime: typeof json.expirationTime === 'number' ? json.expirationTime : null,
		userAgent: navigator.userAgent.slice(0, 255)
	};
}

/** Where the browser stands when the platform's key could not be read. */
function stateWithoutKey(error: unknown): InboxWebPushState {
	if (ApiErrorService.isApiError(error) && error.isEndpointUnavailable()) return 'unavailable';
	// The platform did not answer: switching on can be tried again, where the browser can take notifications.
	return supportsWebPush() ? 'off' : 'unsupported';
}

/**
 * Where the browser stands once the platform answered its key: what it can do, and whether it is subscribed and
 * registered. Reading it never registers the device: the platform's register creates a device it does not hold, so a
 * call here could bring back one the person removed from another device (even between the list and the call). A device
 * the platform no longer lists (removed by the person, or dropped after failed pushes) shows off, and only switching on
 * here, a choice made on this device, registers it again.
 */
async function browserPushState(): Promise<InboxWebPushState> {
	if (!supportsWebPush()) return 'unsupported';
	if (Notification.permission === 'denied') return 'blocked';
	const subscription = await currentSubscription().catch(() => null);
	if (!subscription || Notification.permission !== 'granted') return 'off';
	// The list unread, whether the device is still registered is unknown: it shows off, and switching on sets it up.
	const devices = await inboxPushService.devices().catch(() => null);
	return devices?.some((device) => device.endpoint === subscription.endpoint) ? 'on' : 'off';
}

/**
 * Browser notifications for the inbox on this device. `enable` asks the person for permission, registers the
 * worker, subscribes with the platform's VAPID key and registers the device; `disable` removes the device and
 * unsubscribes. Only `enable` registers: a browser that is subscribed shows on while the platform lists it, and off
 * once it does not, until the person switches it on here, so a device removed from another browser stays removed.
 * `devices` lists every device of the person (this one is `thisEndpoint`), and `removeDevice` takes one off — this
 * one included, which also unsubscribes this browser.
 */
export function useInboxWebPush(enabled: boolean) {
	const [state, setState] = useState<InboxWebPushState>('loading');
	const [busy, setBusy] = useState(false);
	const [devices, setDevices] = useState<IInboxPushDevice[]>([]);
	const [thisEndpoint, setThisEndpoint] = useState<string | null>(null);

	const loadDevices = useCallback(async () => {
		const endpoint = (await thisBrowserPushSubscription())?.endpoint ?? null;
		const listed = await inboxPushService.devices().catch(() => null);
		setThisEndpoint(endpoint);
		if (listed) setDevices(sortPushDevices(listed, endpoint));
	}, []);

	const refresh = useCallback(async () => {
		if (!enabled) {
			setState('unavailable');
			return;
		}
		try {
			await inboxPushService.publicKey();
		} catch (error) {
			const next = stateWithoutKey(error);
			setState(next);
			// A platform that answered something else than "no web push" may still list and remove the devices.
			if (next !== 'unavailable') await loadDevices();
			return;
		}
		setState(await browserPushState());
		// The other devices are listed even where this browser cannot take notifications itself.
		await loadDevices();
	}, [enabled, loadDevices]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const enable = useCallback(async () => {
		setBusy(true);
		try {
			const permission = await Notification.requestPermission();
			if (permission !== 'granted') {
				setState(permission === 'denied' ? 'blocked' : 'off');
				return false;
			}
			const registration = await navigator.serviceWorker.register(INBOX_PUSH_WORKER_URL, { scope: '/' });
			await navigator.serviceWorker.ready;
			const publicKey = await inboxPushService.publicKey();
			const subscription =
				(await registration.pushManager.getSubscription()) ??
				(await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) as BufferSource }));
			try {
				await inboxPushService.register(deviceInputOf(subscription));
			} catch (error) {
				// Not registered: the browser must not keep a subscription the platform never pushes to.
				await subscription.unsubscribe().catch(() => undefined);
				throw error;
			}
			setState('on');
			await loadDevices();
			return true;
		} finally {
			setBusy(false);
		}
	}, [loadDevices]);

	const disable = useCallback(async () => {
		setBusy(true);
		try {
			const subscription = await currentSubscription();
			if (subscription) {
				const devices = await inboxPushService.devices().catch(() => []);
				const device = devices.find((candidate) => candidate.endpoint === subscription.endpoint);
				if (device) await inboxPushService.remove(device.id);
				await subscription.unsubscribe();
			}
			setState('off');
			await loadDevices();
		} finally {
			setBusy(false);
		}
	}, [loadDevices]);

	const removeDevice = useCallback(
		async (device: IInboxPushDevice) => {
			if (thisEndpoint && device.endpoint === thisEndpoint) {
				await disable();
				return;
			}
			setBusy(true);
			try {
				await inboxPushService.remove(device.id);
				setDevices((current) => current.filter((candidate) => candidate.id !== device.id));
			} finally {
				setBusy(false);
			}
		},
		[disable, thisEndpoint]
	);

	return { state, busy, enable, disable, refresh, devices, thisEndpoint, removeDevice };
}
