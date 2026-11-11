import { createStore } from 'jotai';
import { realtimePausesPollingAtom, realtimePromptDeliveryAtom, realtimeStatusAtom } from './realtime';

/**
 * A tab whose live connection was open stopped polling, and showed a colleague's chat message up to a minute late:
 * that platform handed events to subscribers once a minute at best. An open connection pauses the polls only where
 * the platform says it delivers promptly.
 */
describe('realtimePausesPollingAtom', () => {
	it('pauses no poll for an open connection while the platform does not deliver promptly', () => {
		const store = createStore();
		expect(store.get(realtimePromptDeliveryAtom)).toBe(false);
		for (const status of ['off', 'connecting', 'connected', 'reconnecting', 'stopped'] as const) {
			store.set(realtimeStatusAtom, status);
			expect(store.get(realtimePausesPollingAtom)).toBe(false);
		}
	});

	it('pauses the polls only while connected to a platform that delivers promptly', () => {
		const store = createStore();
		store.set(realtimePromptDeliveryAtom, true);
		for (const status of ['off', 'connecting', 'reconnecting', 'stopped'] as const) {
			store.set(realtimeStatusAtom, status);
			expect(store.get(realtimePausesPollingAtom)).toBe(false);
		}
		store.set(realtimeStatusAtom, 'connected');
		expect(store.get(realtimePausesPollingAtom)).toBe(true);

		// The platform stops saying so (a redeploy without it): the polls come back.
		store.set(realtimePromptDeliveryAtom, false);
		expect(store.get(realtimePausesPollingAtom)).toBe(false);
	});
});
