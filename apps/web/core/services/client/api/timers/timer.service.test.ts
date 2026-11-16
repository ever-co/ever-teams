/**
 * A team can require a daily plan before its members track time. Gauzy used to accept a plan dated the UTC day
 * before, of or after the start, so a member who had only planned tomorrow could track today. The start now names
 * the member's day, the same browser day the timer checks read plans for, in both API modes.
 *
 * The start also names the team of the tab that starts it: the team cookie is shared by every tab, and another tab
 * may have switched it to its own team (#5120).
 */
// apps/web/.env sets NEXT_PUBLIC_GAUZY_API_SERVER_URL, which would otherwise decide the API mode of every case.
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: undefined }
}));

// The browser runs three hours east of UTC, whatever zone the suite itself runs in: the member's day is computed in
// that zone, so a UTC day would be the day before.
const mockBrowserOffsetMinutes = 3 * 60;

jest.mock('moment', () => {
	const actualMoment = jest.requireActual('moment');
	function browserMoment(...args: unknown[]) {
		if (args.length > 0) {
			return actualMoment(...args);
		}
		return actualMoment().utcOffset(mockBrowserOffsetMinutes);
	}
	return Object.assign(browserMoment, actualMoment);
});

const mockFallbackPost = jest.fn();
const mockFallbackGet = jest.fn();

// Another tab has switched the team cookie every tab shares to its own team
jest.mock('@/core/lib/helpers/cookies', () => ({
	...jest.requireActual('@/core/lib/helpers/cookies'),
	getActiveTeamIdCookie: () => 'team-of-another-tab'
}));

jest.mock('../../api.service', () => ({
	...jest.requireActual('../../api.service'),
	getFallbackAPI: async () => ({ post: mockFallbackPost, get: mockFallbackGet })
}));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { type SentTimeSlot, timeSlotsBetween } from '@/core/lib/helpers/timer';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { timerService } from './timer.service';

const publishedApiOrigin = GAUZY_API_BASE_SERVER_URL as { value: string | undefined };

beforeEach(() => {
	// 01:30 on the 5th in the browser, still the 4th in UTC.
	jest.useFakeTimers({
		now: new Date('2026-11-04T22:30:00.000Z'),
		doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask']
	});
	mockFallbackPost.mockResolvedValue({ data: {} });
	// The windows of Gauzy's slots hold nothing yet
	mockFallbackGet.mockResolvedValue({ data: [] });
});

afterEach(() => {
	jest.useRealTimers();
	jest.restoreAllMocks();
	jest.clearAllMocks();
	publishedApiOrigin.value = undefined;
});

describe('TimerService.startTimer', () => {
	it("sends the member's day to Gauzy in direct mode", async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.startTimer({ taskId: 'task-1', isBillable: false });

		expect(post).toHaveBeenCalledWith(
			'/timesheet/timer/start',
			expect.objectContaining({ taskId: 'task-1', planDay: '2026-11-05' })
		);
	});

	it("sends the member's day to the start route in proxy mode", async () => {
		await timerService.startTimer({ taskId: 'task-1', isBillable: false });

		expect(mockFallbackPost).toHaveBeenCalledWith(expect.stringMatching(/^\/timer\/start\?/), {
			taskId: 'task-1',
			isBillable: false,
			planDay: '2026-11-05'
		});
	});

	it('sends the notes of the entry to Gauzy in direct mode', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.startTimer({ taskId: 'task-1', isBillable: false, description: 'Fix the login page' });

		expect(post).toHaveBeenCalledWith(
			'/timesheet/timer/start',
			expect.objectContaining({ taskId: 'task-1', description: 'Fix the login page' })
		);
	});

	it('sends no notes field to Gauzy for a start without notes', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.startTimer({ taskId: 'task-1', isBillable: false });

		const sentBody = post.mock.calls[0][1];
		expect(sentBody).not.toHaveProperty('description');
	});

	it('sends the notes of the entry to the start route in proxy mode', async () => {
		await timerService.startTimer({ taskId: 'task-1', isBillable: false, description: 'Fix the login page' });

		expect(mockFallbackPost).toHaveBeenCalledWith(expect.stringMatching(/^\/timer\/start\?/), {
			taskId: 'task-1',
			isBillable: false,
			description: 'Fix the login page',
			planDay: '2026-11-05'
		});
	});

	it("starts on this tab's team, not the one another tab left in the team cookie, in direct mode", async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.startTimer({ taskId: 'task-1', organizationTeamId: 'team-of-this-tab', isBillable: false });

		expect(post).toHaveBeenCalledWith(
			'/timesheet/timer/start',
			expect.objectContaining({ organizationTeamId: 'team-of-this-tab' })
		);
	});

	it("sends this tab's team to the start route in proxy mode", async () => {
		await timerService.startTimer({ taskId: 'task-1', organizationTeamId: 'team-of-this-tab', isBillable: false });

		expect(mockFallbackPost).toHaveBeenCalledWith(
			expect.stringMatching(/^\/timer\/start\?/),
			expect.objectContaining({ organizationTeamId: 'team-of-this-tab' })
		);
	});
});

describe('TimerService.stopTimer', () => {
	it('sends the notes changed during the run to Gauzy in direct mode', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.stopTimer({ source: ETimeLogSource.TEAMS, description: 'Fix the login page' });

		expect(post).toHaveBeenCalledWith(
			'/timesheet/timer/stop',
			expect.objectContaining({ source: ETimeLogSource.TEAMS, description: 'Fix the login page' })
		);
	});

	it('sends the notes changed during the run to the stop route in proxy mode', async () => {
		await timerService.stopTimer({ source: ETimeLogSource.TEAMS, description: '' });

		expect(mockFallbackPost).toHaveBeenCalledWith(expect.stringMatching(/^\/timer\/stop\?/), {
			source: ETimeLogSource.TEAMS,
			description: ''
		});
	});

	it('sends no notes field for a stop whose notes did not change', async () => {
		await timerService.stopTimer({ source: ETimeLogSource.TEAMS });

		expect(mockFallbackPost).toHaveBeenCalledWith(expect.stringMatching(/^\/timer\/stop\?/), {
			source: ETimeLogSource.TEAMS
		});
	});

	// A stop made for one run (the one a person asked to stop before their session ended) names it, so that Gauzy
	// refuses it when another run is the running one by then
	const namedStop = {
		source: ETimeLogSource.TEAMS,
		stoppedAt: '2026-11-04T22:00:00.000Z',
		timeLogId: '9a1c3f0e-6f0b-4d53-9a43-1c1f6a2b7d10'
	};

	it('names the time log a stop is for to Gauzy in direct mode', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: {} } as never);

		await timerService.stopTimer(namedStop);

		expect(post).toHaveBeenCalledWith('/timesheet/timer/stop', expect.objectContaining(namedStop));
	});

	it('names the time log a stop is for to the stop route in proxy mode', async () => {
		await timerService.stopTimer(namedStop);

		expect(mockFallbackPost).toHaveBeenCalledWith(expect.stringMatching(/^\/timer\/stop\?/), namedStop);
	});
});

describe('TimerService.discardTimer', () => {
	it("discards the caller's running log through Gauzy in direct mode, naming the log it saw", async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: undefined } as never);
		const status = jest
			.spyOn(timerService, 'getTimerStatus')
			.mockResolvedValue({ data: { running: false } } as never);

		const answer = await timerService.discardTimer({ timeLogId: 'log-1' });

		expect(post).toHaveBeenCalledWith('/timesheet/timer/discard', expect.objectContaining({ timeLogId: 'log-1' }));
		expect(Object.keys(post.mock.calls[0][1] as object)).toEqual(
			expect.arrayContaining(['tenantId', 'organizationId'])
		);
		expect(status).toHaveBeenCalled();
		expect(answer.data).toEqual({ running: false });
	});

	it('reports a discard as done when the status read after it fails', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		jest.spyOn(timerService, 'post').mockResolvedValue({ data: undefined } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockRejectedValue(new Error('Network Error'));

		await expect(timerService.discardTimer({ timeLogId: 'log-1' })).resolves.toEqual({ data: undefined });
	});

	it('sends no log id for a discard that saw none', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: undefined } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: { running: false } } as never);

		await timerService.discardTimer({});

		expect(post.mock.calls[0][1]).not.toHaveProperty('timeLogId');
	});

	it('discards through the discard route in proxy mode, which answers the new status', async () => {
		mockFallbackPost.mockResolvedValue({ data: { running: false } });

		const answer = await timerService.discardTimer({ timeLogId: 'log-1' });

		expect(mockFallbackPost).toHaveBeenCalledWith(expect.stringMatching(/^\/timer\/discard\?/), {
			timeLogId: 'log-1'
		});
		expect(answer.data).toEqual({ running: false });
	});
});

describe('TimerService.catchUpTimeSlots', () => {
	// Seven minutes the run went on without a heartbeat, across the 22:20 window of Gauzy's slots
	const kept = {
		source: ETimeLogSource.TEAMS,
		employeeId: 'employee-1',
		timeLogId: 'log-1',
		fromMs: Date.parse('2026-11-04T22:17:30.000Z'),
		toMs: Date.parse('2026-11-04T22:24:30.000Z'),
		// The run started at 20:00, before the windows it is owed
		runStartedAtMs: Date.parse('2026-11-04T20:00:00.000Z')
	};

	it('writes the whole time to Gauzy in direct mode, one slot per window, starting at the last heartbeat', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const post = jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
		jest.spyOn(timerService, 'get').mockResolvedValue({ data: [] } as never);
		jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: { running: true } } as never);

		await timerService.catchUpTimeSlots(kept);

		expect(post.mock.calls).toEqual([
			[
				'/timesheet/time-slot',
				expect.objectContaining({
					logType: 'TRACKED',
					source: ETimeLogSource.TEAMS,
					employeeId: 'employee-1',
					timeLogId: 'log-1',
					startedAt: '2026-11-04T22:17:30.000Z',
					duration: 150
				})
			],
			[
				'/timesheet/time-slot',
				expect.objectContaining({ timeLogId: 'log-1', startedAt: '2026-11-04T22:20:00.000Z', duration: 270 })
			]
		]);
	});

	it('writes the whole time through the sync route in proxy mode', async () => {
		mockFallbackPost.mockResolvedValue({ data: { running: true } });

		const answer = await timerService.catchUpTimeSlots(kept);

		expect(mockFallbackPost.mock.calls).toEqual([
			[
				expect.stringMatching(/^\/timer\/sync\?/),
				{
					source: ETimeLogSource.TEAMS,
					timeLogId: 'log-1',
					startedAt: '2026-11-04T22:17:30.000Z',
					duration: 150
				}
			],
			[
				expect.stringMatching(/^\/timer\/sync\?/),
				{
					source: ETimeLogSource.TEAMS,
					timeLogId: 'log-1',
					startedAt: '2026-11-04T22:20:00.000Z',
					duration: 270
				}
			]
		]);
		expect(answer?.data).toEqual({ running: true });
	});

	it('tells how far it wrote when a write fails part way, so the rest is written from there', async () => {
		mockFallbackPost.mockResolvedValueOnce({ data: {} }).mockRejectedValueOnce(new Error('Network Error'));
		const onWritten = jest.fn();

		await expect(timerService.catchUpTimeSlots({ ...kept, onWritten })).rejects.toThrow('Network Error');

		expect(onWritten.mock.calls).toEqual([[Date.parse('2026-11-04T22:20:00.000Z')]]);
	});

	describe('when the answer of a slot written is lost', () => {
		/** Gauzy's windows of slots: the seconds each holds, added up per slot and capped at 600, as its merge does. */
		const gauzy = new Map<number, number>();
		const windowOf = (startedAt: string) => Math.floor(Date.parse(startedAt) / 600_000) * 600_000;
		let losesAnswerOf: string | null = null;

		beforeEach(() => {
			gauzy.clear();
			// 22:10-22:20 held 150 seconds of heartbeats before the run went on without the app
			gauzy.set(windowOf('2026-11-04T22:10:00.000Z'), 150);
			mockFallbackPost.mockImplementation(async (_url: string, body: { startedAt: string; duration: number }) => {
				const window = windowOf(body.startedAt);
				gauzy.set(window, Math.min(600, (gauzy.get(window) ?? 0) + body.duration));
				if (body.startedAt === losesAnswerOf) throw new Error('Network Error');
				return { data: { running: true } };
			});
			// Gauzy answers the slots of the runs started between the dates, which the read starts at the run's start for
			mockFallbackGet.mockImplementation(async (url: string) => {
				const query = new URLSearchParams(url.split('?')[1]);
				const startDate = Date.parse(query.get('startDate') ?? '');
				const endDate = Date.parse(query.get('endDate') ?? '');
				const isRunIncluded = startDate <= kept.runStartedAtMs && kept.runStartedAtMs <= endDate;
				const slots = [...gauzy].map(([window, duration]) => ({
					startedAt: new Date(window).toISOString(),
					duration
				}));
				return {
					data: isRunIncluded ? slots.filter((slot) => Date.parse(slot.startedAt) <= endDate) : []
				};
			});
		});

		afterEach(() => {
			losesAnswerOf = null;
		});

		it('writes each window once when the next try resumes after a slot that landed', async () => {
			losesAnswerOf = '2026-11-04T22:17:30.000Z';
			let unanswered: SentTimeSlot | undefined;
			const firstTry = timerService.catchUpTimeSlots({
				...kept,
				onSending: (slot) => {
					unanswered = slot;
				}
			});
			await expect(firstTry).rejects.toThrow('Network Error');
			expect(unanswered).toEqual(
				expect.objectContaining({ startedAt: '2026-11-04T22:17:30.000Z', windowBefore: 150 })
			);

			const onWritten = jest.fn();
			const nextTry = timerService.catchUpTimeSlots({ ...kept, unanswered, onWritten });
			// It may still be landing for as long as the app waits for a request
			await jest.advanceTimersByTimeAsync(60_000);
			await nextTry;

			// 150 seconds before, and the 150 the lost answer was for: not 450
			expect(gauzy.get(windowOf('2026-11-04T22:10:00.000Z'))).toBe(300);
			expect(gauzy.get(windowOf('2026-11-04T22:20:00.000Z'))).toBe(270);
			expect(mockFallbackPost).toHaveBeenCalledTimes(2);
			expect(onWritten.mock.calls).toEqual([
				[Date.parse('2026-11-04T22:20:00.000Z')],
				[Date.parse('2026-11-04T22:24:30.000Z')]
			]);
		});

		it('sends a slot again whose window does not hold it: that write failed before Gauzy took it', async () => {
			mockFallbackPost.mockRejectedValueOnce(new Error('Network Error'));
			let unanswered: SentTimeSlot | undefined;
			await expect(
				timerService.catchUpTimeSlots({
					...kept,
					onSending: (slot) => {
						unanswered = slot;
					}
				})
			).rejects.toThrow('Network Error');

			const nextTry = timerService.catchUpTimeSlots({ ...kept, unanswered });
			await jest.advanceTimersByTimeAsync(60_000);
			await nextTry;

			expect(gauzy.get(windowOf('2026-11-04T22:10:00.000Z'))).toBe(300);
			expect(gauzy.get(windowOf('2026-11-04T22:20:00.000Z'))).toBe(270);
		});

		it('takes a slot sent without an answer as landed when the run has no start to read its window from', async () => {
			losesAnswerOf = '2026-11-04T22:17:30.000Z';
			let unanswered: SentTimeSlot | undefined;
			await expect(
				timerService.catchUpTimeSlots({
					...kept,
					onSending: (slot) => {
						unanswered = slot;
					}
				})
			).rejects.toThrow('Network Error');

			const onWritten = jest.fn();
			const nextTry = timerService.catchUpTimeSlots({
				...kept,
				runStartedAtMs: Number.NaN,
				unanswered,
				onWritten
			});
			await jest.advanceTimersByTimeAsync(60_000);
			await nextTry;

			// Read from the window alone, it would show none of the run's slots: the slot would be sent again
			expect(gauzy.get(windowOf('2026-11-04T22:10:00.000Z'))).toBe(300);
			expect(onWritten).toHaveBeenNthCalledWith(1, Date.parse('2026-11-04T22:20:00.000Z'));
		});

		it('waits out a slot still landing on Gauzy before it reads its window: a page reloaded at once', async () => {
			// The page gives the request up as it reloads; Gauzy carries it out ten seconds later
			mockFallbackPost.mockImplementationOnce(
				async (_url: string, body: { startedAt: string; duration: number }) => {
					setTimeout(() => {
						const window = windowOf(body.startedAt);
						gauzy.set(window, Math.min(600, (gauzy.get(window) ?? 0) + body.duration));
					}, 10_000);
					throw new Error('Network Error');
				}
			);
			let unanswered: SentTimeSlot | undefined;
			await expect(
				timerService.catchUpTimeSlots({
					...kept,
					onSending: (slot) => {
						unanswered = slot;
					}
				})
			).rejects.toThrow('Network Error');

			const nextTry = timerService.catchUpTimeSlots({ ...kept, unanswered });
			await jest.advanceTimersByTimeAsync(60_000);
			await nextTry;

			expect(gauzy.get(windowOf('2026-11-04T22:10:00.000Z'))).toBe(300);
		});

		it("reads the window of each slot from the run's start, which Gauzy reads the slots of, in its own mode", async () => {
			publishedApiOrigin.value = 'https://api.example.test';
			jest.spyOn(timerService, 'post').mockResolvedValue({ data: {} } as never);
			jest.spyOn(timerService, 'getTimerStatus').mockResolvedValue({ data: { running: true } } as never);
			const get = jest.spyOn(timerService, 'get').mockResolvedValue({ data: [] } as never);

			await timerService.catchUpTimeSlots(kept);

			expect(get).toHaveBeenCalledTimes(2);
			const query = new URLSearchParams(String(get.mock.calls[0][0]).split('?')[1]);
			expect(query.get('startDate')).toBe('2026-11-04T20:00:00.000Z');
			expect(query.get('endDate')).toBe('2026-11-04T22:19:59.999Z');
			expect(query.get('employeeIds[0]')).toBe('employee-1');
		});
	});

	it('leaves the next heartbeat to write the minute after it, not the time it wrote again', async () => {
		await timerService.catchUpTimeSlots(kept);
		mockFallbackPost.mockClear();
		jest.advanceTimersByTime(60_000);

		await timerService.syncTimer({ source: ETimeLogSource.TEAMS, timeLogId: 'log-1' });

		expect(mockFallbackPost).toHaveBeenCalledWith(expect.stringMatching(/^\/timer\/sync\?/), {
			source: ETimeLogSource.TEAMS,
			duration: 60
		});
	});
});

describe('timeSlotsBetween', () => {
	const at = (time: string) => Date.parse(`2026-11-04T${time}.000Z`);

	it('holds the time in one slot within a window', () => {
		expect(timeSlotsBetween(at('22:21:00'), at('22:28:00'))).toEqual([
			{ startedAt: '2026-11-04T22:21:00.000Z', duration: 420, untilMs: at('22:28:00') }
		]);
	});

	it('splits a longer time at each window, a slot holding 600 seconds at most, across midnight too', () => {
		expect(timeSlotsBetween(at('23:55:00'), Date.parse('2026-11-05T00:17:00.000Z'))).toEqual([
			{ startedAt: '2026-11-04T23:55:00.000Z', duration: 300, untilMs: Date.parse('2026-11-05T00:00:00.000Z') },
			{ startedAt: '2026-11-05T00:00:00.000Z', duration: 600, untilMs: Date.parse('2026-11-05T00:10:00.000Z') },
			{ startedAt: '2026-11-05T00:10:00.000Z', duration: 420, untilMs: Date.parse('2026-11-05T00:17:00.000Z') }
		]);
	});

	it('holds nothing for no time, or a time that ends before it starts', () => {
		expect(timeSlotsBetween(at('22:21:00'), at('22:21:00'))).toEqual([]);
		expect(timeSlotsBetween(at('22:21:00'), at('22:20:00'))).toEqual([]);
		expect(timeSlotsBetween(Number.NaN, at('22:20:00'))).toEqual([]);
	});
});
