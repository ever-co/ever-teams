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
async function load(isServer: boolean): Promise<{ config: Config; rq: ReactQuery }> {
	let config: Config | undefined;
	let rq: ReactQuery | undefined;
	await jest.isolateModulesAsync(async () => {
		jest.doMock('@tanstack/react-query', () => ({ ...jest.requireActual('@tanstack/react-query'), isServer }));
		rq = await import('@tanstack/react-query');
		config = await import('./index');
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
		// No gcTime key at all for `plain`: an explicit undefined would override the client's default
		new rq.QueryObserver(client, {
			queryKey: [key],
			queryFn: async () => [],
			enabled: false,
			...(gcTime === undefined ? {} : { gcTime })
		});
	}
	client.getQueryCache().build(client, { queryKey: ['prefetched'], gcTime: 15 * 60 * 1000 });
}

const gcTimes = (client: QueryClient) =>
	client
		.getQueryCache()
		.getAll()
		.map((query) => query.gcTime);

let client: QueryClient | undefined;

afterEach(() => {
	client?.clear();
	client = undefined;
	jest.useRealTimers();
});

describe('createQueryClientInstance', () => {
	it('arms no GC timer on the server, whatever gcTime a query asks for', async () => {
		const { config, rq } = await load(true);
		jest.useFakeTimers();
		client = config.createQueryClientInstance();
		const timersBefore = jest.getTimerCount();

		render(rq, client);

		expect(gcTimes(client)).toEqual([Infinity, Infinity, Infinity, Infinity]);
		expect(jest.getTimerCount()).toBe(timersBefore);
	});

	it('keeps the other defaults and per-query options on the server', async () => {
		const { config } = await load(true);
		client = config.createQueryClientInstance();

		const options = client.defaultQueryOptions({ queryKey: ['x'] });
		expect(options).toEqual(expect.objectContaining({ staleTime: 5 * 60 * 1000, retry: 1, gcTime: Infinity }));
		expect(client.defaultQueryOptions({ queryKey: ['x'], staleTime: 7 }).staleTime).toBe(7);
	});

	it('keeps the 24-hour cache and per-query gcTime in the browser', async () => {
		const { config, rq } = await load(false);
		jest.useFakeTimers();
		client = config.createQueryClientInstance();
		const timersBefore = jest.getTimerCount();

		render(rq, client);

		expect(gcTimes(client)).toEqual([DAY_MS, 30 * 60 * 1000, DAY_MS, 15 * 60 * 1000]);
		// One GC timer per query, as before: the browser client lives as long as the page
		expect(jest.getTimerCount()).toBe(timersBefore + 4);
	});
});
