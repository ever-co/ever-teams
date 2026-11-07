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

/** Whether this browser can receive web push at all (a service worker, the Push API, notifications). */
export function supportsWebPush(scope: { navigator?: Navigator; PushManager?: unknown; Notification?: unknown } = globalThis as never): boolean {
	return !!scope.navigator && 'serviceWorker' in scope.navigator && !!scope.PushManager && !!scope.Notification;
}
