import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import {
	canDuplicateLog,
	type ContinueViewer,
	continuableTaskOf,
	copiedFieldsOf,
	copySecondsOf,
	duplicateIntervalOf,
	latestLogOfTask,
	overlappedLogOf,
	periodLengthOf,
	recentTasksOf,
	tasksByIdOf,
	timeChoiceOf,
	timerCarryOf,
	unplacedIntervalOf,
	withRunningLog
} from './time-entry-reuse';

const MINUTE = 60;
const HOUR = 3600;

/** Thursday 12 November 2026, 15:37:20, in the zone the suite runs in. */
const NOW = new Date(2026, 10, 12, 15, 37, 20);

function today(hours: number, minutes = 0, seconds = 0) {
	return new Date(2026, 10, 12, hours, minutes, seconds);
}

function yesterday(hours: number, minutes = 0) {
	return new Date(2026, 10, 11, hours, minutes);
}

function taskOf(id: string, extra: Partial<TTask> = {}): TTask {
	return { id, title: `Task ${id}`, status: 'in-progress', ...extra } as unknown as TTask;
}

function logOf(id: string, extra: Record<string, unknown> = {}): ITimeLog {
	return { id, employeeId: 'employee-1', duration: 0, ...extra } as unknown as ITimeLog;
}

function entryOf(id: string, taskId: string | null, start: Date, end: Date, extra: Record<string, unknown> = {}) {
	return logOf(id, { taskId: taskId ?? undefined, startedAt: start, stoppedAt: end, ...extra });
}

const VIEWER: ContinueViewer = { userId: 'user-1', employeeId: 'employee-1', canTrackTime: true };

const TEAM_TASKS = tasksByIdOf([taskOf('task-1'), taskOf('task-2'), taskOf('task-closed', { status: 'closed' })]);

describe('continuableTaskOf', () => {
	const entry = entryOf('log-1', 'task-1', yesterday(9), yesterday(10));

	it("gives the team's task of the member's own finished entry", () => {
		expect(continuableTaskOf(entry, VIEWER, TEAM_TASKS)?.id).toBe('task-1');
	});

	it('reads the task from the entry when only the relation carries it', () => {
		const withRelation = logOf('log-2', { task: { id: 'task-2' }, startedAt: yesterday(9) });

		expect(continuableTaskOf(withRelation, VIEWER, TEAM_TASKS)?.id).toBe('task-2');
	});

	it('offers nothing where the member cannot track time', () => {
		const viewer = { ...VIEWER, canTrackTime: false };

		expect(continuableTaskOf(entry, viewer, TEAM_TASKS)).toBeNull();
	});

	it("offers nothing on another member's entry", () => {
		const theirs = entryOf('log-3', 'task-1', yesterday(9), yesterday(10), { employeeId: 'employee-2' });

		expect(continuableTaskOf(theirs, VIEWER, TEAM_TASKS)).toBeNull();
	});

	it('offers nothing on the entry the timer is recording', () => {
		const running = entryOf('log-4', 'task-1', today(15), today(15, 30), { isRunning: true });

		expect(continuableTaskOf(running, VIEWER, TEAM_TASKS)).toBeNull();
	});

	it('offers nothing on an entry without a task, or whose task the team no longer lists', () => {
		const untasked = entryOf('log-5', null, yesterday(9), yesterday(10));
		const gone = entryOf('log-6', 'task-removed', yesterday(9), yesterday(10));

		expect(continuableTaskOf(untasked, VIEWER, TEAM_TASKS)).toBeNull();
		expect(continuableTaskOf(gone, VIEWER, TEAM_TASKS)).toBeNull();
	});
});

describe('timerCarryOf', () => {
	it('hands over the billable status and the notes of the entry', () => {
		const entry = logOf('log-1', { isBillable: true, description: '  Review the invoices  ' });

		expect(timerCarryOf(entry)).toEqual({ isBillable: true, description: 'Review the invoices' });
	});

	it('hands over no notes for an entry that has none', () => {
		expect(timerCarryOf(logOf('log-1', { description: '   ' }))).toEqual({ isBillable: false, description: null });
		expect(timerCarryOf(logOf('log-2'))).toEqual({ isBillable: false, description: null });
	});
});

describe('latestLogOfTask', () => {
	it('picks the entry of the task that started last', () => {
		const logs = [
			entryOf('early', 'task-1', today(9), today(10)),
			entryOf('late', 'task-1', today(14), today(15)),
			entryOf('other', 'task-2', today(15), today(15, 30))
		];

		expect(latestLogOfTask(logs, 'task-1')?.id).toBe('late');
	});

	it('finds nothing for a task without an entry', () => {
		expect(latestLogOfTask([entryOf('log-1', 'task-2', today(9), today(10))], 'task-1')).toBeNull();
	});
});

describe('recentTasksOf', () => {
	it('lists each task once, the last tracked first, with the project of its latest entry', () => {
		const logs = [
			entryOf('log-1', 'task-1', yesterday(9), yesterday(10), { project: { name: 'Old project' } }),
			entryOf('log-2', 'task-2', yesterday(11), yesterday(12), {
				project: { name: 'Website', color: '#3366ff', imageUrl: 'https://img.example/site.png' }
			}),
			entryOf('log-3', 'task-1', today(9), today(10), { project: { name: 'Mobile app' } })
		];

		const recent = recentTasksOf(logs, TEAM_TASKS);

		expect(recent.map((item) => item.task.id)).toEqual(['task-1', 'task-2']);
		expect(recent[0].projectName).toBe('Mobile app');
		expect(recent[1]).toMatchObject({
			projectName: 'Website',
			projectColor: '#3366ff',
			projectImageUrl: 'https://img.example/site.png'
		});
	});

	it('leaves out a task the team no longer lists, a closed task and the time tracked without a task', () => {
		const logs = [
			entryOf('log-1', 'task-2', yesterday(8), yesterday(9)),
			entryOf('log-2', 'task-removed', yesterday(10), yesterday(11)),
			entryOf('log-3', 'task-closed', yesterday(12), yesterday(13)),
			entryOf('log-4', null, today(9), today(10))
		];

		const recent = recentTasksOf(logs, TEAM_TASKS);

		expect(recent.map((item) => item.task.id)).toEqual(['task-2']);
		expect(recent[0].projectName).toBeNull();
	});

	it('stops at the limit', () => {
		const tasks = tasksByIdOf([taskOf('a'), taskOf('b'), taskOf('c')]);
		const logs = [
			entryOf('log-1', 'a', today(9), today(10)),
			entryOf('log-2', 'b', today(11), today(12)),
			entryOf('log-3', 'c', today(13), today(14))
		];

		expect(recentTasksOf(logs, tasks, 2).map((item) => item.task.id)).toEqual(['c', 'b']);
	});

	it('is empty for a member who tracked nothing', () => {
		expect(recentTasksOf([], TEAM_TASKS)).toEqual([]);
	});
});

describe('copiedFieldsOf', () => {
	it('takes the task, project, member, billable status and notes of the entry', () => {
		const entry = logOf('log-1', {
			taskId: 'task-1',
			projectId: 'project-1',
			isBillable: true,
			description: ' Pairing '
		});

		expect(copiedFieldsOf(entry)).toEqual({
			taskId: 'task-1',
			projectId: 'project-1',
			employeeId: 'employee-1',
			isBillable: true,
			description: 'Pairing'
		});
	});

	it('leaves empty what the entry does not have', () => {
		const entry = { id: 'log-1', duration: 0 } as unknown as ITimeLog;

		expect(copiedFieldsOf(entry)).toEqual({
			taskId: '',
			projectId: '',
			employeeId: '',
			isBillable: false,
			description: ''
		});
	});
});

describe('copySecondsOf', () => {
	it('keeps whole minutes, to the nearest one', () => {
		expect(copySecondsOf(37 * MINUTE + 12, 1)).toBe(37 * MINUTE);
		expect(copySecondsOf(37 * MINUTE + 40, 1)).toBe(38 * MINUTE);
	});

	it('keeps whole steps of five minutes for the dialog that offers its times every five minutes', () => {
		expect(copySecondsOf(37 * MINUTE, 5)).toBe(35 * MINUTE);
		expect(copySecondsOf(38 * MINUTE, 5)).toBe(40 * MINUTE);
	});

	it('never goes under one step, nor over what a day holds', () => {
		expect(copySecondsOf(4, 1)).toBe(MINUTE);
		expect(copySecondsOf(20, 5)).toBe(5 * MINUTE);
		expect(copySecondsOf(30 * HOUR, 5)).toBe(24 * HOUR - 5 * MINUTE);
	});
});

describe('overlappedLogOf', () => {
	const morning = entryOf('morning', 'task-1', today(9), today(10, 30));

	it('names the entry the interval runs over', () => {
		const interval = { start: today(10), end: today(11) };

		expect(overlappedLogOf(interval, [morning], NOW)?.id).toBe('morning');
	});

	it('accepts an interval that only touches an entry', () => {
		const after = { start: today(10, 30), end: today(11) };
		const before = { start: today(8), end: today(9) };

		expect(overlappedLogOf(after, [morning], NOW)).toBeNull();
		expect(overlappedLogOf(before, [morning], NOW)).toBeNull();
	});

	it('counts the entry the timer is recording up to now, whatever its last heartbeat wrote', () => {
		const running = entryOf('running', 'task-1', today(14), today(14, 10), { isRunning: true });
		const interval = { start: today(15), end: today(15, 30) };

		expect(overlappedLogOf(interval, [running], NOW)?.id).toBe('running');
	});

	it('reads the end of an entry from its duration when it has no end', () => {
		const withDuration = logOf('timed', { startedAt: today(9), duration: 90 * MINUTE });

		expect(overlappedLogOf({ start: today(10), end: today(11) }, [withDuration], NOW)?.id).toBe('timed');
		expect(overlappedLogOf({ start: today(10, 30), end: today(11) }, [withDuration], NOW)).toBeNull();
	});

	it('ignores an entry that holds no time', () => {
		const empty = entryOf('empty', 'task-1', today(10), today(10));

		expect(overlappedLogOf({ start: today(9), end: today(11) }, [empty], NOW)).toBeNull();
	});
});

describe('withRunningLog', () => {
	const listed = entryOf('listed', 'task-1', today(9), today(10));

	it('adds the entry the timer is recording when what was read does not list it yet', () => {
		const running = entryOf('running', 'task-1', today(15, 30), today(15, 30));

		const logs = withRunningLog([listed], running);

		expect(logs.map((log) => log.id)).toEqual(['listed', 'running']);
		expect(logs[1].isRunning).toBe(true);
		expect(overlappedLogOf({ start: today(15), end: today(15, 35) }, logs, NOW)?.id).toBe('running');
	});

	it('leaves the entries as read when the running one is already among them, or when no timer runs', () => {
		const running = entryOf('listed', 'task-1', today(9), today(10), { isRunning: true });

		expect(withRunningLog([listed], running)).toEqual([listed]);
		expect(withRunningLog([listed], null)).toEqual([listed]);
	});
});

describe('duplicateIntervalOf', () => {
	function placed(sourceStart: Date | null, seconds: number, memberLogs: ITimeLog[], stepMinutes = 1, now = NOW) {
		return duplicateIntervalOf({ seconds, sourceStart, memberLogs, now, stepMinutes });
	}

	it("keeps yesterday's time of day when that time is free today and already past", () => {
		const interval = placed(yesterday(9, 12), 90 * MINUTE, []);

		expect(interval).toEqual({ start: today(9, 12), end: today(10, 42) });
	});

	it('moves the copy of an entry of today to the latest free stretch, ending now', () => {
		const source = entryOf('source', 'task-1', today(9), today(10));

		const interval = placed(today(9), HOUR, [source]);

		expect(interval).toEqual({ start: today(14, 37), end: today(15, 37) });
	});

	it('does not place a copy in the hours still to come', () => {
		const interval = placed(yesterday(16), HOUR, []);

		expect(interval).toEqual({ start: today(14, 37), end: today(15, 37) });
	});

	it('skips a stretch too short for the copy and takes an earlier one', () => {
		const logs = [entryOf('late', 'task-1', today(11), today(15, 20))];

		const interval = placed(today(12), HOUR, logs);

		expect(interval).toEqual({ start: today(10), end: today(11) });
	});

	it('goes before the entry the timer is recording', () => {
		const running = entryOf('running', 'task-1', today(13), today(13, 5), { isRunning: true });

		const interval = placed(yesterday(14), 2 * HOUR, [running]);

		expect(interval).toEqual({ start: today(11), end: today(13) });
	});

	it('counts an entry started the evening before that runs into today', () => {
		const overnight = entryOf('overnight', 'task-1', yesterday(23), today(2));
		const afternoon = entryOf('afternoon', 'task-1', today(3), today(15, 37));

		const interval = placed(null, 30 * MINUTE, [overnight, afternoon]);

		expect(interval).toEqual({ start: today(2, 30), end: today(3) });
	});

	it('keeps to the minute edges of the entries around it', () => {
		const logs = [
			entryOf('before', 'task-1', today(9), today(11, 0, 40)),
			entryOf('after', 'task-1', today(12, 30, 10), today(15, 37))
		];

		const interval = placed(today(9), 80 * MINUTE, logs);

		expect(interval).toEqual({ start: today(11, 10), end: today(12, 30) });
	});

	it('finds no place when today has no free stretch long enough', () => {
		const earlyMorning = new Date(2026, 10, 12, 0, 20);

		expect(placed(yesterday(9), HOUR, [], 1, earlyMorning)).toBeNull();
	});

	it('starts and ends on five minute steps for the dialog that offers its times every five minutes', () => {
		const source = entryOf('source', 'task-1', today(9), today(10));

		const sameTime = placed(yesterday(9, 12), 35 * MINUTE, [], 5);
		const moved = placed(today(9), 35 * MINUTE, [source], 5);

		expect(sameTime).toEqual({ start: today(9, 10), end: today(9, 45) });
		expect(moved).toEqual({ start: today(15), end: today(15, 35) });
	});
});

describe('unplacedIntervalOf', () => {
	it("opens the copy at the entry's own time of day", () => {
		expect(unplacedIntervalOf(yesterday(9, 12), HOUR, NOW, 1)).toEqual({ start: today(9, 12), end: today(10, 12) });
	});

	it('moves it earlier when it would pass midnight', () => {
		const interval = unplacedIntervalOf(yesterday(23, 30), 2 * HOUR, NOW, 5);

		expect(interval).toEqual({ start: today(21, 55), end: today(23, 55) });
	});

	it('opens at the present time of day for an entry without a start', () => {
		expect(unplacedIntervalOf(null, HOUR, NOW, 1)).toEqual({ start: today(15, 37), end: today(16, 37) });
	});
});

describe('the time and length texts of the Add time entry dialog', () => {
	it('writes a time as its time choices are written', () => {
		expect(timeChoiceOf(today(0, 5))).toBe('12:05:00 AM');
		expect(timeChoiceOf(today(9, 30))).toBe('09:30:00 AM');
		expect(timeChoiceOf(today(12))).toBe('12:00:00 PM');
		expect(timeChoiceOf(today(14, 5))).toBe('02:05:00 PM');
	});

	it('writes the length of a period as that dialog does', () => {
		expect(periodLengthOf(90 * MINUTE)).toBe('01:30h');
		expect(periodLengthOf(5 * MINUTE)).toBe('00:05h');
		expect(periodLengthOf(10 * HOUR)).toBe('10:00h');
	});
});

describe('canDuplicateLog', () => {
	const ownEntry = logOf('log-own', { employeeId: 'employee-1' });
	const teammateEntry = logOf('log-teammate', { employeeId: 'employee-2', employee: { id: 'employee-2' } });

	it('offers Duplicate on every entry to a viewer who adds time for anyone', () => {
		expect(canDuplicateLog(ownEntry, true, null)).toBe(true);
		expect(canDuplicateLog(teammateEntry, true, null)).toBe(true);
	});

	it("offers it on the viewer's own entries only when they add their own time only", () => {
		expect(canDuplicateLog(ownEntry, true, 'employee-1')).toBe(true);
		expect(canDuplicateLog(teammateEntry, true, 'employee-1')).toBe(false);
	});

	it('offers it on no entry when the viewer may not add time', () => {
		expect(canDuplicateLog(ownEntry, false, null)).toBe(false);
		expect(canDuplicateLog(ownEntry, false, 'employee-1')).toBe(false);
	});

	describe('with what the Add time dialog offers', () => {
		const teamTargets = { tasks: [{ id: 'task-1' }], members: [{ employeeId: 'employee-1' }] };
		const ownTask = logOf('log-own-task', { employeeId: 'employee-1', taskId: 'task-1' });
		const otherTeamTask = logOf('log-other-team', { employeeId: 'employee-1', taskId: 'task-9' });
		const untasked = logOf('log-untasked', { employeeId: 'employee-1' });
		const otherTeamMember = logOf('log-other-member', { employeeId: 'employee-9', taskId: 'task-1' });

		it('offers it on an entry whose task and member the dialog can keep', () => {
			expect(canDuplicateLog(ownTask, true, null, teamTargets)).toBe(true);
		});

		it('does not offer it on an entry the dialog would open without its task or its member', () => {
			expect(canDuplicateLog(otherTeamTask, true, null, teamTargets)).toBe(false);
			expect(canDuplicateLog(untasked, true, null, teamTargets)).toBe(false);
			expect(canDuplicateLog(otherTeamMember, true, null, teamTargets)).toBe(false);
		});

		it('needs no member in the list for a viewer who adds their own time only', () => {
			const withoutMembers = { ...teamTargets, members: [] };

			expect(canDuplicateLog(ownTask, true, 'employee-1', withoutMembers)).toBe(true);
			expect(canDuplicateLog(otherTeamTask, true, 'employee-1', withoutMembers)).toBe(false);
		});
	});
});
