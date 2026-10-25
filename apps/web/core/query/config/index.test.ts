/**
 * A server-side QueryClient (one per request) must arm no cache GC timer: a pending timer keeps the request's async
 * context, and with it the whole render, in memory until it fires. The 24-hour gcTime did that for every server
 * render, health probes included, until the web pods were OOM-killed. The browser keeps its 24-hour cache.
 */
import type { QueryClient } from '@tanstack/react-query';

jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));

type Config = typeof import('./index');
type ReactQuery = typeof import('@tanstack/react-query');

const DAY_MS = 24 * 60 * 60 * 1000;

/** The config module and the react-query it uses, loaded as on the server or in the browser. */
function load(isServer: boolean): { config: Config; rq: ReactQuery } {
	let config: Config | undefined;
	let rq: ReactQuery | undefined;
	jest.isolateModules(() => {
		jest.doMock('@tanstack/react-query', () => ({ ...jest.requireActual('@tanstack/react-query'), isServer }));
		rq = require('@tanstack/react-query');
		config = require('./index');
	});
	return { config: config as Config, rq: rq as ReactQuery };
}

/** What a render does: observers for a few queries (two with their own gcTime) and one prefetched query. */
function render(rq: ReactQuery, client: QueryClient) {
	const queries: [string, number | undefined][] = [
		['languages', DAY_MS],
		['teams', 30 * 60 * 1000],
		['plain', undefined]
	];
	for (const [key, gcTime] of queries) {
		new rq.QueryObserver(client, { queryKey: [key], queryFn: async () => [], enabled: false, gcTime });
	}
	client.getQueryCache().build(client, { queryKey: ['prefetched'], gcTime: 15 * 60 * 1000 });
}

const gcTimes = (client: QueryClient) =>
	client
		.getQueryCache()
		.getAll()
		.map((query) => query.gcTime);

let client: QueryClient | undefined;

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	client?.clear();
	client = undefined;
	jest.useRealTimers();
});

describe('createQueryClientInstance', () => {
	it('arms no GC timer on the server, whatever gcTime a query asks for', () => {
		const { config, rq } = load(true);
		client = config.createQueryClientInstance();
		const timersBefore = jest.getTimerCount();

		render(rq, client);

		expect(gcTimes(client)).toEqual([Infinity, Infinity, Infinity, Infinity]);
		expect(jest.getTimerCount()).toBe(timersBefore);
	});

	it('keeps the other defaults and per-query options on the server', () => {
		const { config } = load(true);
		client = config.createQueryClientInstance();

		const options = client.defaultQueryOptions({ queryKey: ['x'] });
		expect(options).toEqual(expect.objectContaining({ staleTime: 5 * 60 * 1000, retry: 1, gcTime: Infinity }));
		expect(client.defaultQueryOptions({ queryKey: ['x'], staleTime: 7 }).staleTime).toBe(7);
	});

	it('keeps the 24-hour cache and per-query gcTime in the browser', () => {
		const { config, rq } = load(false);
		client = config.createQueryClientInstance();
		const timersBefore = jest.getTimerCount();

		render(rq, client);

		expect(gcTimes(client)).toEqual([DAY_MS, 30 * 60 * 1000, DAY_MS, 15 * 60 * 1000]);
		// One GC timer per query, as before: the browser client lives as long as the page
		expect(jest.getTimerCount()).toBe(timersBefore + 4);
	});
});
