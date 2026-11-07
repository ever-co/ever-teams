/**
 * The bytes of a base64url string (the VAPID public key as the platform answers it), as `PushManager.subscribe`
 * takes its `applicationServerKey`.
 */
export function base64UrlToBytes(value: string): Uint8Array {
	const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
	const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
	return bytes;
}

/**
 * Ends this browser's push subscription, if it has one (a sign-out, a session that ended): the push service then
 * refuses the platform's next push to it, and the platform drops the device. Never throws.
 */
export async function unsubscribeThisBrowserPush(): Promise<PushSubscription | null> {
	try {
		if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
		const registration = await navigator.serviceWorker.getRegistration('/');
		const subscription = (await registration?.pushManager.getSubscription()) ?? null;
		if (subscription) await subscription.unsubscribe();
		return subscription;
	} catch {
		return null;
	}
}

/** Whether this browser can receive web push at all (a service worker, the Push API, notifications). */
export function supportsWebPush(scope: { navigator?: Navigator; PushManager?: unknown; Notification?: unknown } = globalThis as never): boolean {
	return !!scope.navigator && 'serviceWorker' in scope.navigator && !!scope.PushManager && !!scope.Notification;
}
