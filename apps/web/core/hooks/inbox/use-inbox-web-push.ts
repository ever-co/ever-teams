'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { inboxPushService } from '@/core/services/client/api/inbox';
import { base64UrlToBytes, supportsWebPush } from '@/core/lib/utils/web-push';

/** The worker that shows pushed inbox entries (served from `public/`). */
export const INBOX_PUSH_WORKER_URL = '/inbox-push-sw.js';

/**
 * Where this browser stands: `unavailable` (the platform has web push off), `unsupported` (the browser cannot),
 * `blocked` (the person refused notifications for the site), `off`, `on`, `loading`.
 */
export type InboxWebPushState = 'loading' | 'unavailable' | 'unsupported' | 'blocked' | 'off' | 'on';

async function currentSubscription(): Promise<PushSubscription | null> {
	const registration = await navigator.serviceWorker.getRegistration('/');
	return (await registration?.pushManager.getSubscription()) ?? null;
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

/**
 * Browser notifications for the inbox on this device. `enable` asks the person for permission, registers the
 * worker, subscribes with the platform's VAPID key and registers the device; `disable` removes the device and
 * unsubscribes. A browser that is subscribed is registered again when the hook starts (the platform may have
 * removed the device after failed pushes): it is the same device, refreshed.
 */
export function useInboxWebPush(enabled: boolean) {
	const [state, setState] = useState<InboxWebPushState>('loading');
	const [busy, setBusy] = useState(false);

	const refresh = useCallback(async () => {
		if (!enabled) {
			setState('unavailable');
			return;
		}
		if (!supportsWebPush()) {
			setState('unsupported');
			return;
		}
		try {
			await inboxPushService.publicKey();
		} catch (error) {
			setState(ApiErrorService.isApiError(error) && error.isEndpointUnavailable() ? 'unavailable' : 'off');
			return;
		}
		if (Notification.permission === 'denied') {
			setState('blocked');
			return;
		}
		const subscription = await currentSubscription().catch(() => null);
		if (subscription && Notification.permission === 'granted') {
			await inboxPushService.register(deviceInputOf(subscription)).catch(() => undefined);
			setState('on');
			return;
		}
		setState('off');
	}, [enabled]);

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
			return true;
		} finally {
			setBusy(false);
		}
	}, []);

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
		} finally {
			setBusy(false);
		}
	}, []);

	return { state, busy, enable, disable, refresh };
}
