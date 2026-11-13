/**
 * A due date names a calendar day, stored in the platform's date-only form: midnight UTC of that day. A day picked in
 * one zone must be the same day for a reader in any other.
 *
 * Jest hands each test file a copy of process.env, where TZ changes nothing: Node reads the real process's TZ. The
 * zone is set on the real process, reached through node:vm, and the first case checks that the offset really moved.
 */
import { runInThisContext } from 'node:vm';
import { dateOnlyOf, dayNumberOf, dayOfStoredDate, shownDayOf } from './date-only';
import { acceptsDueDate, acceptsStartDate, daysUntilDue } from './task-detail';
import { dueDateToneOf, sortTeamTasks } from './team-tasks-view';
import type { TTask } from '@/core/types/schemas/task/task.schema';

/** UTC−4 all year (no daylight saving), and UTC+2 all year. */
const WEST = 'America/Caracas';
const EAST = 'Africa/Johannesburg';

/** Runs `body` with the clock in `zone`, as a browser there would be. */
function inZone<T>(zone: string, body: () => T): T {
	const host = runInThisContext('process') as NodeJS.Process;
	const previous = host.env.TZ;
	const current = Intl.DateTimeFormat().resolvedOptions().timeZone;
	host.env.TZ = zone;
	try {
		return body();
	} finally {
		// Deleting TZ does not reset the clock's zone: set the one before first.
		host.env.TZ = previous ?? current;
		if (previous === undefined) delete host.env.TZ;
	}
}

/** What a picker gives for a day: the local midnight of it, sent as JSON. */
const pickedAndSent = (year: number, month: number, date: number) =>
	JSON.parse(JSON.stringify({ dueDate: dateOnlyOf(new Date(year, month, date)) })).dueDate as string;

const dayText = (date: Date | null) => date && new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);

describe('a due date picked in one zone and read in another', () => {
	it('switches the clock’s zone for real (the cases below would hold in one zone)', () => {
		expect(inZone(WEST, () => new Date(2026, 10, 14).getTimezoneOffset())).toBe(240);
		expect(inZone(EAST, () => new Date(2026, 10, 14).getTimezoneOffset())).toBe(-120);
	});

	it('was a moment before: the local midnight of 14 Nov picked in UTC+2 reads as 13 Nov in UTC−4', () => {
		const sentBefore = inZone(EAST, () => new Date(2026, 10, 14).toISOString());
		expect(sentBefore).toBe('2026-11-13T22:00:00.000Z');
		expect(inZone(WEST, () => dayText(new Date(sentBefore)))).toBe('Nov 13, 2026');
	});

	it('keeps 14 Nov picked in UTC−4 on 14 Nov for a reader in UTC+2, and the other way round', () => {
		const fromWest = inZone(WEST, () => pickedAndSent(2026, 10, 14));
		const fromEast = inZone(EAST, () => pickedAndSent(2026, 10, 14));
		expect(fromWest).toBe('2026-11-14T00:00:00.000Z');
		expect(fromEast).toBe('2026-11-14T00:00:00.000Z');

		for (const zone of [WEST, EAST, 'America/Los_Angeles', 'Pacific/Auckland', 'UTC']) {
			inZone(zone, () => {
				expect(`${zone} ${dayText(shownDayOf(fromWest))}`).toBe(`${zone} Nov 14, 2026`);
				expect(`${zone} ${dayOfStoredDate(fromWest)}`).toBe(`${zone} ${dayNumberOf(new Date(2026, 10, 14))}`);
			});
		}
	});

	it('is due today, not late, all of its own day west of UTC, where its midnight UTC is the evening before', () => {
		inZone(WEST, () => {
			const stored = '2026-11-14T00:00:00.000Z';
			const morning = new Date(2026, 10, 14, 8, 0);
			const lateEvening = new Date(2026, 10, 14, 23, 30);
			const nextDay = new Date(2026, 10, 15, 0, 30);
			expect(daysUntilDue(stored, morning)).toBe(0);
			expect(daysUntilDue(stored, lateEvening)).toBe(0);
			expect(daysUntilDue(stored, nextDay)).toBe(-1);
			expect(dueDateToneOf(stored, false, lateEvening.getTime())).toBe('soon');
			expect(dueDateToneOf(stored, false, nextDay.getTime())).toBe('overdue');
			expect(daysUntilDue(stored, new Date(2026, 10, 13, 21, 0))).toBe(1);
		});
		inZone(EAST, () => {
			const stored = '2026-11-14T00:00:00.000Z';
			expect(daysUntilDue(stored, new Date(2026, 10, 14, 0, 30))).toBe(0);
			expect(dueDateToneOf(stored, false, new Date(2026, 10, 14, 23, 30).getTime())).toBe('soon');
		});
	});

	it('takes a start on the due day itself, in either zone', () => {
		for (const zone of [WEST, EAST]) {
			inZone(zone, () => {
				const due = '2026-11-14T00:00:00.000Z';
				expect(`${zone} ${acceptsStartDate(new Date(2026, 10, 14), due)}`).toBe(`${zone} true`);
				expect(`${zone} ${acceptsStartDate(new Date(2026, 10, 15), due)}`).toBe(`${zone} false`);
				// A start saved as its local midnight, as the start picker saves it.
				const start = new Date(2026, 10, 14).toISOString();
				expect(`${zone} ${acceptsDueDate(new Date(2026, 10, 14), start)}`).toBe(`${zone} true`);
				expect(`${zone} ${acceptsDueDate(new Date(2026, 10, 13), start)}`).toBe(`${zone} false`);
			});
		}
	});

	it('orders due dates by the day they name before the moment, west of UTC', () => {
		inZone(WEST, () => {
			const task = (id: string, dueDate: string) => ({ id, title: id, dueDate }) as unknown as TTask;
			// 14 Nov as a date only is 13 Nov 20:00 there; 13 Nov 22:00 local is an earlier day, though a later instant.
			const tasks = [
				task('date-only-14', '2026-11-14T00:00:00.000Z'),
				task('moment-13', '2026-11-14T02:00:00.000Z')
			];
			expect(sortTeamTasks(tasks, 'dueDate', false).map((item) => item.id)).toEqual([
				'moment-13',
				'date-only-14'
			]);
		});
	});

	it('reads a bare day, a moment and nothing as before', () => {
		inZone(WEST, () => {
			expect(dayOfStoredDate('2026-11-14')).toBe(dayNumberOf(new Date(2026, 10, 14)));
			expect(dayText(shownDayOf('2026-11-14T15:00:00.000Z'))).toBe('Nov 14, 2026');
			expect(shownDayOf(null)).toBeNull();
			expect(shownDayOf('not a date')).toBeNull();
		});
	});
});
