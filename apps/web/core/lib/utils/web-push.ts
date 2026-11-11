import type { IInboxPushDevice } from '@/core/services/client/api/inbox/inbox-push.service';

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

/** This browser's push subscription (the inbox worker's), if it has one. Never throws. */
export async function thisBrowserPushSubscription(): Promise<PushSubscription | null> {
	try {
		if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
		const registration = await navigator.serviceWorker.getRegistration('/');
		return (await registration?.pushManager.getSubscription()) ?? null;
	} catch {
		return null;
	}
}

/**
 * Ends this browser's push subscription, if it has one (a sign-out, a session that ended): the push service then
 * refuses the platform's next push to it, and the platform drops the device. Never throws.
 */
export async function unsubscribeThisBrowserPush(): Promise<PushSubscription | null> {
	try {
		const subscription = await thisBrowserPushSubscription();
		if (subscription) await subscription.unsubscribe();
		return subscription;
	} catch {
		return null;
	}
}

/** What a device's user agent says it is: the browser and the system, as their makers name them. */
interface PushDeviceName {
	browser: string | null;
	system: string | null;
}

// Most specific first: Edge, Opera and Samsung Internet also say Chrome, Chrome also says Safari, and the iOS
// browsers name their own engine wrappers.
const BROWSERS: ReadonlyArray<[RegExp, string]> = [
	[/Edg(e|A|iOS)?\//, 'Edge'],
	[/(OPR|Opera)\//, 'Opera'],
	[/SamsungBrowser\//, 'Samsung Internet'],
	[/(Firefox|FxiOS)\//, 'Firefox'],
	[/(Chrome|CriOS|Chromium)\//, 'Chrome'],
	[/Version\/[\d.]+.*Safari\//, 'Safari']
];

// iOS and Android before the desktop systems their user agents also mention ("like Mac OS X", "Linux").
const SYSTEMS: ReadonlyArray<[RegExp, string]> = [
	[/(iPhone|iPad|iPod)/, 'iOS'],
	[/Android/, 'Android'],
	[/CrOS/, 'ChromeOS'],
	[/Windows/, 'Windows'],
	[/Mac OS X|Macintosh/, 'macOS'],
	[/Linux/, 'Linux']
];

function firstMatch(value: string, candidates: ReadonlyArray<[RegExp, string]>): string | null {
	return candidates.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

/** The name a device is listed under, from the user agent it was registered with. */
export function pushDeviceNameOf(userAgent: string | null | undefined): PushDeviceName {
	const value = String(userAgent ?? '');
	return { browser: firstMatch(value, BROWSERS), system: firstMatch(value, SYSTEMS) };
}

/** The devices, this one first, then the most recently used (a device never used: when it was added). */
export function sortPushDevices(devices: readonly IInboxPushDevice[], thisEndpoint: string | null): IInboxPushDevice[] {
	const timeOf = (device: IInboxPushDevice) => Date.parse(device.lastUsedAt ?? device.createdAt ?? '') || 0;
	const isThis = (device: IInboxPushDevice) => !!thisEndpoint && device.endpoint === thisEndpoint;
	return [...devices].sort((a, b) => {
		if (isThis(a) !== isThis(b)) return isThis(a) ? -1 : 1;
		return timeOf(b) - timeOf(a);
	});
}

/** Whether this browser can receive web push at all (a service worker, the Push API, notifications). */
export function supportsWebPush(scope: { navigator?: Navigator; PushManager?: unknown; Notification?: unknown } = globalThis as never): boolean {
	return !!scope.navigator && 'serviceWorker' in scope.navigator && !!scope.PushManager && !!scope.Notification;
}
