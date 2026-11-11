/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { inboxPushService } from '@/core/services/client/api/inbox';
import { useInboxWebPush } from './use-inbox-web-push';

jest.mock('@/core/services/client/api/inbox', () => ({
	inboxPushService: {
		publicKey: jest.fn(),
		devices: jest.fn(),
		register: jest.fn(),
		remove: jest.fn()
	}
}));

const service = inboxPushService as jest.Mocked<typeof inboxPushService>;
const THIS_ENDPOINT = 'https://push.example/this-browser';

/** This browser: subscribed to pushes by the inbox worker, notifications allowed. */
function subscribedBrowser() {
	const subscription = {
		endpoint: THIS_ENDPOINT,
		toJSON: () => ({ endpoint: THIS_ENDPOINT, keys: { p256dh: 'p256dh', auth: 'auth' } }),
		unsubscribe: jest.fn().mockResolvedValue(true)
	};
	const registration = { pushManager: { getSubscription: jest.fn().mockResolvedValue(subscription) } };
	Object.defineProperty(navigator, 'serviceWorker', {
		configurable: true,
		value: { getRegistration: jest.fn().mockResolvedValue(registration) }
	});
	Object.assign(globalThis, {
		PushManager: function PushManager() {},
		Notification: { permission: 'granted', requestPermission: jest.fn() }
	});
	return subscription;
}

beforeEach(() => {
	service.publicKey.mockResolvedValue('BPublicKey');
	service.register.mockResolvedValue({ id: 'device-this', endpoint: THIS_ENDPOINT });
});

describe('useInboxWebPush, a browser that is subscribed', () => {
	it('stays removed when the person removed it from another device: it is not registered again', async () => {
		subscribedBrowser();
		service.devices.mockResolvedValue([{ id: 'device-other', endpoint: 'https://push.example/other-browser' }]);

		const { result } = renderHook(() => useInboxWebPush(true));

		await waitFor(() => expect(result.current.state).toBe('off'));
		expect(service.register).not.toHaveBeenCalled();
	});

	it('is registered again (refreshed) while the platform still lists it', async () => {
		subscribedBrowser();
		service.devices.mockResolvedValue([{ id: 'device-this', endpoint: THIS_ENDPOINT }]);

		const { result } = renderHook(() => useInboxWebPush(true));

		await waitFor(() => expect(result.current.state).toBe('on'));
		expect(service.register).toHaveBeenCalledTimes(1);
		expect(service.register.mock.calls[0][0]).toMatchObject({
			endpoint: THIS_ENDPOINT,
			keys: { p256dh: 'p256dh', auth: 'auth' }
		});
	});

	it('is not registered when its devices cannot be read, and shows off', async () => {
		subscribedBrowser();
		service.devices.mockRejectedValue(new Error('offline'));

		const { result } = renderHook(() => useInboxWebPush(true));

		await waitFor(() => expect(result.current.state).toBe('off'));
		expect(service.register).not.toHaveBeenCalled();
	});

	it('is registered again when the person switches it on here', async () => {
		subscribedBrowser();
		service.devices.mockResolvedValue([]);
		const ready = Promise.resolve();
		Object.defineProperty(navigator, 'serviceWorker', {
			configurable: true,
			value: {
				...navigator.serviceWorker,
				register: jest.fn().mockResolvedValue(await navigator.serviceWorker.getRegistration('/')),
				ready
			}
		});
		(
			globalThis as unknown as { Notification: { requestPermission: jest.Mock } }
		).Notification.requestPermission.mockResolvedValue('granted');

		const { result } = renderHook(() => useInboxWebPush(true));
		await waitFor(() => expect(result.current.state).toBe('off'));

		let enabled = false;
		await act(async () => {
			enabled = await result.current.enable();
		});
		expect(enabled).toBe(true);
		expect(service.register).toHaveBeenCalledTimes(1);
		expect(result.current.state).toBe('on');
	});
});
