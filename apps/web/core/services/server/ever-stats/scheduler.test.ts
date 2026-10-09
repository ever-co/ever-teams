/**
 * The reporter asks the paired API before EVERY send and sends nothing unless it answers
 * `200 {enabled:true}`; an unpaired API (404) is logged once as skipped_gauzy_unpaired. It never keeps
 * the process alive, retries failed deliveries, re-sends the closed month once on days 1-3, and stays
 * off without a usable configuration.
 */
import { startEverStats, stopEverStats, FIRST_SEND_DELAY_MS, type SchedulerDeps } from './scheduler';
import { reporterState, resetReporterState } from './state';

const PAIRED = 'http://api:3000';
const SINK = 'http://127.0.0.1:3989';

type Timer = { callback: () => void; delayMs: number; unref: jest.Mock; cleared: boolean };

let info: jest.SpyInstance;
let warn: jest.SpyInstance;

beforeEach(() => {
	stopEverStats();
	resetReporterState();
	delete (globalThis as { __everTeamsConfigWarnings?: Set<string> }).__everTeamsConfigWarnings;
	info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
	warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
	stopEverStats();
	info.mockRestore();
	warn.mockRestore();
});

/** A paired API answering `state`, and a sink answering 202 (or `sinkStatus`). */
function world({
	state,
	sinkStatus = 202
}: {
	state: () => Response | Promise<Response>;
	sinkStatus?: number;
}) {
	const stateCalls: string[] = [];
	const reports: Array<Record<string, unknown>> = [];
	const fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		if (url === `${PAIRED}/api/ever-stats/state`) {
			stateCalls.push(url);
			return state();
		}
		if (url === `${SINK}/v1/stats/reports`) {
			reports.push(JSON.parse(Buffer.from(init?.body as Uint8Array).toString('utf8')));
			return new Response('{}', { status: sinkStatus, headers: { 'content-type': 'application/json' } });
		}
		throw new Error(`unexpected request to ${url}`);
	}) as unknown as typeof globalThis.fetch;
	return { fetch, stateCalls, reports };
}

function deps(fetch: typeof globalThis.fetch, overrides: Partial<SchedulerDeps> = {}) {
	const timers: Timer[] = [];
	let clock = new Date('2026-11-10T08:00:00Z');
	const base: SchedulerDeps = {
		env: { GAUZY_API_SERVER_URL: PAIRED, EVER_STATS_API_URL: SINK },
		now: () => clock,
		fetch,
		random: () => 0.5,
		setTimer: (callback, delayMs) => {
			const timer = { callback, delayMs, unref: jest.fn(), cleared: false };
			timers.push(timer);
			return timer;
		},
		clearTimer: (timer) => {
			(timer as Timer).cleared = true;
		},
		...overrides
	};
	return { deps: base, timers, setClock: (next: Date) => (clock = next) };
}

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('the statistics reporter', () => {
	it('schedules its first attempt 10 minutes after the start, on a timer that never keeps the process alive', () => {
		const { fetch } = world({ state: () => json({ enabled: true }) });
		const { deps: d, timers } = deps(fetch);
		expect(startEverStats(d)).not.toBeNull();
		expect(timers).toHaveLength(1);
		expect(timers[0].delayMs).toBe(FIRST_SEND_DELAY_MS);
		expect(timers[0].unref).toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
		// One reporter per process.
		expect(startEverStats(d)).toBe(startEverStats(d));
	});

	it('sends exactly one report when the paired API says enabled', async () => {
		const { fetch, reports, stateCalls } = world({ state: () => json({ enabled: true }) });
		const { deps: d } = deps(fetch);
		await startEverStats(d)?.runNow();
		expect(stateCalls).toHaveLength(1);
		expect(reports).toHaveLength(1);
		expect(reports[0]).toMatchObject({ product: 'teams', instance_kind: 'frontend', serves: ['teams'], final: false });
		expect(reporterState().status).toBe('running');
	});

	it.each([
		['{enabled:false}', () => json({ enabled: false }), 'skipped_gauzy_off'],
		['404 (unpaired)', () => json({ statusCode: 404 }, 404), 'skipped_gauzy_unpaired'],
		['500', () => json({}, 500), 'skipped_gauzy_unreachable'],
		['a body that is not {enabled:true}', () => json({ enabled: 'true' }), 'skipped_gauzy_unreachable'],
		[
			'no answer',
			() => {
				throw new TypeError('fetch failed');
			},
			'skipped_gauzy_unreachable'
		]
	])('sends nothing when the paired API answers %s, and logs it once', async (_label, state, outcome) => {
		const { fetch, reports } = world({ state: state as () => Response });
		const { deps: d } = deps(fetch);
		const scheduler = startEverStats(d);
		await scheduler?.runNow();
		await scheduler?.runNow();
		await scheduler?.runNow();
		expect(reports).toHaveLength(0);
		const lines = info.mock.calls.map((call) => String(call[0])).filter((line) => line.startsWith('ever_stats.send'));
		expect(lines).toEqual([`ever_stats.send outcome=${outcome} status=- final=false`]);
		expect(reporterState().status).toBe('paused_by_api');
	});

	it('follows the switch of the paired API: off stops the next report, on sends the next one', async () => {
		let enabled = true;
		const { fetch, reports } = world({ state: () => json({ enabled }) });
		const { deps: d } = deps(fetch);
		const scheduler = startEverStats(d);
		await scheduler?.runNow();
		expect(reports).toHaveLength(1);
		enabled = false;
		await scheduler?.runNow();
		await scheduler?.runNow();
		await scheduler?.runNow();
		expect(reports).toHaveLength(1);
		enabled = true;
		await scheduler?.runNow();
		expect(reports).toHaveLength(2);
	});

	it('re-sends the closed previous month once on days 1-3', async () => {
		const { fetch, reports } = world({ state: () => json({ enabled: true }) });
		const { deps: d, setClock } = deps(fetch);
		setClock(new Date('2026-11-02T08:00:00Z'));
		const scheduler = startEverStats(d);
		await scheduler?.runNow();
		await scheduler?.runNow();
		expect(reports.map((report) => [report.period, report.final])).toEqual([
			['2026-11', false],
			['2026-10', true],
			['2026-11', false]
		]);
		setClock(new Date('2026-11-04T08:00:00Z'));
		await scheduler?.runNow();
		expect(reports.filter((report) => report.final)).toHaveLength(1);
	});

	it('retries a failed delivery after 1 h, then 4 h, then 12 h', async () => {
		const { fetch } = world({ state: () => json({ enabled: true }), sinkStatus: 503 });
		const { deps: d, timers } = deps(fetch);
		const scheduler = startEverStats(d);
		await scheduler?.runNow();
		await scheduler?.runNow();
		await scheduler?.runNow();
		expect(timers.slice(1).map((timer) => timer.delayMs / 3_600_000)).toEqual([1, 4, 12]);
	});

	it('uses EVER_STATS_SEND_INTERVAL_S for a local statistics address (tests)', () => {
		const { fetch } = world({ state: () => json({ enabled: true }) });
		const { deps: d, timers } = deps(fetch, {
			env: { GAUZY_API_SERVER_URL: PAIRED, EVER_STATS_API_URL: SINK, EVER_STATS_SEND_INTERVAL_S: '5' }
		});
		startEverStats(d);
		expect(timers[0].delayMs).toBe(5_000);
	});

	it.each([
		['no paired API is configured', { EVER_STATS_API_URL: SINK }, 'off_api_unconfigured'],
		['the statistics address is plain http to a public host', { GAUZY_API_SERVER_URL: PAIRED, EVER_STATS_API_URL: 'http://example.com' }, 'off_api_url'],
		['only the instance id is pinned', { GAUZY_API_SERVER_URL: PAIRED, EVER_INSTANCE_ID: '3ddf1821-761d-4247-8f3d-e65e4bc66ac8' }, 'off_key_missing']
	])('stays off, without any request or timer, when %s', (_label, env, status) => {
		const { fetch } = world({ state: () => json({ enabled: true }) });
		const { deps: d, timers } = deps(fetch, { env });
		expect(startEverStats(d)).toBeNull();
		expect(timers).toHaveLength(0);
		expect(fetch).not.toHaveBeenCalled();
		expect(reporterState().status).toBe(status);
	});

	it('retries only the report a slot still misses, stepping through the retry waits', async () => {
		const reports: Array<{ final: boolean }> = [];
		const finalAnswers = [503, 503, 202];
		const fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url === `${PAIRED}/api/ever-stats/state`) return json({ enabled: true });
			const report = JSON.parse(Buffer.from(init?.body as Uint8Array).toString('utf8')) as { final: boolean };
			reports.push(report);
			const status = report.final ? (finalAnswers.shift() ?? 202) : 202;
			return json({}, status);
		}) as unknown as typeof globalThis.fetch;
		// Day 2 of the month: the running month and the closed previous one.
		const { deps: d, timers, setClock } = deps(fetch);
		setClock(new Date('2026-11-02T08:00:00Z'));
		const scheduler = startEverStats(d);
		await scheduler?.runNow();
		expect(reports.map((report) => report.final)).toEqual([false, true]);
		expect(timers.at(-1)?.delayMs).toBe(3600 * 1000);
		await scheduler?.runNow();
		// Only the closed month again, and the next wait is the second step.
		expect(reports.map((report) => report.final)).toEqual([false, true, true]);
		expect(timers.at(-1)?.delayMs).toBe(14400 * 1000);
		await scheduler?.runNow();
		expect(reports.map((report) => report.final)).toEqual([false, true, true, true]);
	});
});
