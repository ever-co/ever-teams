// cspell:ignore KHTML
import { base64UrlToBytes, pushDeviceNameOf, sortPushDevices, supportsWebPush } from './web-push';

describe('web push helpers', () => {
	it('reads a base64url key, padding it as needed', () => {
		// 0x04 0xfb 0xff: a "+" and a "/" in base64, "-" and "_" in base64url.
		expect([...base64UrlToBytes('BPv_')]).toEqual([0x04, 0xfb, 0xff]);
		expect([...base64UrlToBytes('BA')]).toEqual([0x04]);
		expect(base64UrlToBytes('BHSw_eWTIE3eOFj16ZjWL_Js5MVySg7xUkN01JO-HGq854gfl5ULy0AeUlKDrLvmhzQ_AbqStWlRKer47wMZHFg')).toHaveLength(65);
	});

	it('needs a service worker, the Push API and notifications', () => {
		expect(supportsWebPush({ navigator: { serviceWorker: {} } as unknown as Navigator, PushManager: class {}, Notification: class {} })).toBe(true);
		expect(supportsWebPush({ navigator: {} as Navigator, PushManager: class {}, Notification: class {} })).toBe(false);
		expect(supportsWebPush({ navigator: { serviceWorker: {} } as unknown as Navigator, Notification: class {} })).toBe(false);
	});

	it('names a device by its browser and system, the most specific browser first', () => {
		const chromeOnWindows = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
		const edgeOnWindows = `${chromeOnWindows} Edg/142.0.0.0`;
		const safariOnMac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
		const safariOnIphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
		const firefoxOnLinux = 'Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0';
		const chromeOnAndroid = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36';

		expect(pushDeviceNameOf(chromeOnWindows)).toEqual({ browser: 'Chrome', system: 'Windows' });
		expect(pushDeviceNameOf(edgeOnWindows)).toEqual({ browser: 'Edge', system: 'Windows' });
		expect(pushDeviceNameOf(safariOnMac)).toEqual({ browser: 'Safari', system: 'macOS' });
		expect(pushDeviceNameOf(safariOnIphone)).toEqual({ browser: 'Safari', system: 'iOS' });
		expect(pushDeviceNameOf(firefoxOnLinux)).toEqual({ browser: 'Firefox', system: 'Linux' });
		expect(pushDeviceNameOf(chromeOnAndroid)).toEqual({ browser: 'Chrome', system: 'Android' });
		expect(pushDeviceNameOf(null)).toEqual({ browser: null, system: null });
		expect(pushDeviceNameOf('curl/8.0')).toEqual({ browser: null, system: null });
	});

	it('lists this device first, then the most recently used, a never-used device by when it was added', () => {
		const devices = [
			{ id: 'old', endpoint: 'https://push.example/old', lastUsedAt: '2026-11-01T10:00:00Z', createdAt: '2026-10-01T10:00:00Z' },
			{ id: 'new', endpoint: 'https://push.example/new', lastUsedAt: null, createdAt: '2026-11-10T10:00:00Z' },
			{ id: 'this', endpoint: 'https://push.example/this', lastUsedAt: null, createdAt: '2026-09-01T10:00:00Z' },
			{ id: 'recent', endpoint: 'https://push.example/recent', lastUsedAt: '2026-11-09T10:00:00Z', createdAt: null }
		];

		expect(sortPushDevices(devices, 'https://push.example/this').map((device) => device.id)).toEqual(['this', 'new', 'recent', 'old']);
		expect(sortPushDevices(devices, null).map((device) => device.id)).toEqual(['new', 'recent', 'old', 'this']);
		expect(devices.map((device) => device.id)).toEqual(['old', 'new', 'this', 'recent']);
	});
});
