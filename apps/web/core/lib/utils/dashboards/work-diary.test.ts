import type { CalendarEntry } from '@/core/lib/utils/calendar-view';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { DIARY_HISTORY_START, diaryDayOfParam, diaryTasksOf } from './work-diary';

const NOW = new Date(2026, 10, 11, 15, 30);

function entry(
	id: string,
	taskId: string | null,
	daySeconds: number,
	extra: Partial<CalendarEntry> = {}
): CalendarEntry {
	const log = {
		id,
		taskId: taskId ?? undefined,
		task: taskId ? { id: taskId, title: `Task ${taskId}` } : undefined
	} as unknown as ITimeLog;
	return {
		id,
		log,
		start: new Date(2026, 10, 10, 9),
		end: new Date(2026, 10, 10, 10),
		dayKey: '2026-11-10',
		durationSeconds: daySeconds,
		daySeconds,
		isManual: false,
		isRunning: false,
		isBillable: false,
		taskTitle: taskId ? `Task ${taskId}` : null,
		projectName: null,
		projectColor: null,
		reason: null,
		...extra
	};
}

describe('diaryDayOfParam', () => {
	it('opens the local day the link names, at midnight', () => {
		const day = diaryDayOfParam('2026-11-09', NOW);

		expect([day.getFullYear(), day.getMonth(), day.getDate(), day.getHours()]).toEqual([2026, 10, 9, 0]);
	});

	it('opens today when the link names no day, a day that does not exist, or a day still to come', () => {
		const today = new Date(2026, 10, 11);

		expect(diaryDayOfParam(null, NOW)).toEqual(today);
		expect(diaryDayOfParam('yesterday', NOW)).toEqual(today);
		expect(diaryDayOfParam('2026-02-31', NOW)).toEqual(today);
		expect(diaryDayOfParam('2026-11-12', NOW)).toEqual(today);
		expect(diaryDayOfParam('2026-11-11', NOW)).toEqual(today);
	});

	it('goes no further back than the diary does', () => {
		expect(diaryDayOfParam('1999-12-31', NOW)).toEqual(DIARY_HISTORY_START);
	});
});

describe('diaryTasksOf', () => {
	it('adds up the time of each task over the day, longest first, the time without a task as one more row', () => {
		const tasks = diaryTasksOf([
			entry('a', 'task-1', 1800, { projectName: 'Website', projectColor: '#123456' }),
			entry('b', null, 600),
			entry('c', 'task-2', 3600),
			entry('d', 'task-1', 2400, { isRunning: true })
		]);

		expect(tasks.map((task) => [task.key, task.seconds])).toEqual([
			['task-1', 4200],
			['task-2', 3600],
			['no-task', 600]
		]);
		expect(tasks[0]).toMatchObject({ projectName: 'Website', projectColor: '#123456', isRunning: true });
		expect(tasks[0].log.id).toBe('a');
	});

	it('has no tasks on a day without time', () => {
		expect(diaryTasksOf([])).toEqual([]);
	});
});
