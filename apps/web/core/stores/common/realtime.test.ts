import { createStore } from 'jotai';
import { REALTIME_REPLACES_POLLING, realtimePausesPollingAtom, realtimeStatusAtom } from './realtime';

/**
 * A tab whose live connection was open stopped polling, and showed a colleague's chat message up to a minute late:
 * the platform hands events to subscribers once a minute at best. Until it publishes them as they are written, an
 * open connection pauses no poll.
 */
describe('realtimePausesPollingAtom', () => {
	it('pauses no poll for an open connection while the platform does not deliver promptly', () => {
		expect(REALTIME_REPLACES_POLLING).toBe(false);
		const store = createStore();
		for (const status of ['off', 'connecting', 'connected', 'reconnecting', 'stopped'] as const) {
			store.set(realtimeStatusAtom, status);
			expect(store.get(realtimePausesPollingAtom)).toBe(false);
		}
	});
});
