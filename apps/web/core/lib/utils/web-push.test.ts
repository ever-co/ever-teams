import { base64UrlToBytes, supportsWebPush } from './web-push';

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
});
