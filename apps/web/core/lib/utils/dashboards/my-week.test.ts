import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import { totalDurationOf } from '@/core/lib/utils/dashboards/timesheets';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	dailyLimitSecondsOf,
	myWeekDaysOf,
	myWeekEntriesOf,
	myWeekFiguresOf,
	myWeekPeriodOf,
	myWeekProjectsOf,
	myWeekTargetOf,
	namedProjectCountOf,
	projectsInMinutesOf,
	taskIdOfEntry,
	weeklyLimitSecondsOf
} from './my-week';

/** Wednesday of the week that runs from Monday November 9 to Sunday November 15, 2026. */
const NOW = new Date(2026, 10, 11, 15, 30);

const HOUR = 3600;
const ME = 'employee-me';
const SOMEONE_ELSE = 'employee-other';

interface LogOptions {
	employeeId?: string;
	projectId?: string | null;
	projectName?: string | null;
	taskId?: string | null;
	isBillable?: boolean;
	isRunning?: boolean;
}

function projectOf(options: LogOptions) {
	if (!options.projectId) {
		return undefined;
	}
	return { id: options.projectId, name: options.projectName, color: '#3b82f6', imageUrl: null };
}

function taskOf(options: LogOptions) {
	if (!options.taskId) {
		return undefined;
	}
	return { id: options.taskId, title: `Task ${options.taskId}` };
}

function log(id: string, startedAt: Date, stoppedAt: Date, options: LogOptions = {}): ITimeLog {
	return {
		id,
		employeeId: options.employeeId ?? ME,
		startedAt,
		stoppedAt,
		duration: 0,
		isBillable: options.isBillable ?? false,
		isRunning: options.isRunning ?? false,
		projectId: options.projectId ?? undefined,
		project: projectOf(options),
		taskId: options.taskId ?? undefined,
		task: taskOf(options)
	} as unknown as ITimeLog;
}

const WEEK_LOGS: ITimeLog[] = [
	log('monday-design', new Date(2026, 10, 9, 9, 0), new Date(2026, 10, 9, 12, 0), {
		projectId: 'project-web',
		projectName: 'Website',
		taskId: 'task-1',
		isBillable: true
	}),
	log('monday-support', new Date(2026, 10, 9, 14, 0), new Date(2026, 10, 9, 15, 30), {
		projectId: 'project-support',
		projectName: 'Support'
	}),
	log('tuesday-design', new Date(2026, 10, 10, 10, 0), new Date(2026, 10, 10, 14, 0), {
		projectId: 'project-web',
		projectName: 'Website',
		taskId: 'task-1',
		isBillable: true
	}),
	log('wednesday-notes', new Date(2026, 10, 11, 8, 0), new Date(2026, 10, 11, 8, 30))
];

function weekOf(logs: ITimeLog[], now: Date = NOW) {
	const period = myWeekPeriodOf('thisWeek', now);
	const entries = myWeekEntriesOf(logs, period, ME, now);
	const days = myWeekDaysOf(period, entries, now);
	const figures = myWeekFiguresOf(entries, days);
	return { period, entries, days, figures };
}

describe('myWeekPeriodOf', () => {
	it('opens on the week from Monday to Sunday, steps to the week before, and to the month', () => {
		const thisWeek = myWeekPeriodOf('thisWeek', NOW);
		const lastWeek = myWeekPeriodOf('lastWeek', NOW);
		const thisMonth = myWeekPeriodOf('thisMonth', NOW);

		expect([localDayKeyOf(thisWeek.from), localDayKeyOf(thisWeek.to)]).toEqual(['2026-11-09', '2026-11-15']);
		expect([localDayKeyOf(lastWeek.from), localDayKeyOf(lastWeek.to)]).toEqual(['2026-11-02', '2026-11-08']);
		expect([localDayKeyOf(thisMonth.from), localDayKeyOf(thisMonth.to)]).toEqual(['2026-11-01', '2026-11-30']);
	});
});

describe('myWeekEntriesOf', () => {
	it("keeps the signed-in member's entries only, whatever the API answered", () => {
		const logs = [
			...WEEK_LOGS,
			log('teammate', new Date(2026, 10, 10, 9, 0), new Date(2026, 10, 10, 17, 0), {
				employeeId: SOMEONE_ELSE
			})
		];
		const { entries, figures } = weekOf(logs);

		expect(entries.map((entry) => entry.id)).not.toContain('teammate');
		expect(figures.trackedSeconds).toBe(9 * HOUR);
	});

	it('shows nothing for an account without a member profile', () => {
		const period = myWeekPeriodOf('thisWeek', NOW);

		expect(myWeekEntriesOf(WEEK_LOGS, period, null, NOW)).toEqual([]);
	});

	it('drops the entries started on the days the request adds around the period', () => {
		const logs = [
			...WEEK_LOGS,
			log('sunday-before', new Date(2026, 10, 8, 10, 0), new Date(2026, 10, 8, 11, 0)),
			log('monday-after', new Date(2026, 10, 16, 10, 0), new Date(2026, 10, 16, 11, 0))
		];
		const { entries } = weekOf(logs);

		expect(entries.map((entry) => entry.id).sort()).toEqual([
			'monday-design',
			'monday-support',
			'tuesday-design',
			'wednesday-notes'
		]);
	});

	it('lists the newest entry first', () => {
		const { entries } = weekOf(WEEK_LOGS);

		expect(entries.map((entry) => entry.id)).toEqual([
			'wednesday-notes',
			'tuesday-design',
			'monday-support',
			'monday-design'
		]);
	});

	it('counts an entry that runs past midnight whole, on the day it started', () => {
		const lateShift = log('late-shift', new Date(2026, 10, 15, 22, 0), new Date(2026, 10, 16, 1, 0));
		const nextWeek = new Date(2026, 10, 18, 12, 0);

		const sundayWeek = weekOf([lateShift]);
		const mondayWeek = weekOf([lateShift], nextWeek);

		expect(sundayWeek.figures.trackedSeconds).toBe(3 * HOUR);
		expect(sundayWeek.days.at(-1)?.seconds).toBe(3 * HOUR);
		expect(mondayWeek.entries).toEqual([]);
	});

	it('counts a running entry up to the read that returned it', () => {
		const started = new Date(2026, 10, 11, 14, 0);
		const running = log('running', started, started, { isRunning: true });
		const { entries } = weekOf([running]);

		expect(entries[0]?.isRunning).toBe(true);
		expect(entries[0]?.seconds).toBe(1.5 * HOUR);
	});
});

describe('the week total', () => {
	it('is the total Timesheets shows for the same entries', () => {
		const { figures } = weekOf(WEEK_LOGS);

		expect(figures.trackedSeconds).toBe(totalDurationOf(WEEK_LOGS));
		expect(figures.trackedSeconds).toBe(9 * HOUR);
	});
});

describe('myWeekDaysOf', () => {
	it('gives every day of the week its time, marks today and the days still ahead', () => {
		const { days } = weekOf(WEEK_LOGS);

		expect(days.map((day) => day.key)).toEqual([
			'2026-11-09',
			'2026-11-10',
			'2026-11-11',
			'2026-11-12',
			'2026-11-13',
			'2026-11-14',
			'2026-11-15'
		]);
		expect(days.map((day) => day.seconds)).toEqual([4.5 * HOUR, 4 * HOUR, 0.5 * HOUR, 0, 0, 0, 0]);
		expect(days.filter((day) => day.isToday).map((day) => day.key)).toEqual(['2026-11-11']);
		expect(days.filter((day) => day.isFuture).map((day) => day.key)).toEqual([
			'2026-11-12',
			'2026-11-13',
			'2026-11-14',
			'2026-11-15'
		]);
	});

	it('adds up to the week total', () => {
		const { days, figures } = weekOf(WEEK_LOGS);
		const daysTotal = days.reduce((total, day) => total + day.seconds, 0);

		expect(daysTotal).toBe(figures.trackedSeconds);
	});
});

describe('myWeekFiguresOf', () => {
	it("gives today's time and the billable share", () => {
		const { figures } = weekOf(WEEK_LOGS);

		expect(figures.todaySeconds).toBe(0.5 * HOUR);
		expect(figures.billableSeconds).toBe(7 * HOUR);
		expect(figures.billableShare).toBeCloseTo((7 / 9) * 100);
	});

	it('has no figure for today in a period that does not hold it', () => {
		const period = myWeekPeriodOf('lastWeek', NOW);
		const entries = myWeekEntriesOf(WEEK_LOGS, period, ME, NOW);
		const days = myWeekDaysOf(period, entries, NOW);

		expect(myWeekFiguresOf(entries, days).todaySeconds).toBeNull();
	});

	it('has no billable share while nothing is tracked', () => {
		const { figures } = weekOf([]);

		expect(figures.trackedSeconds).toBe(0);
		expect(figures.billableShare).toBeNull();
	});
});

describe('myWeekProjectsOf', () => {
	it('splits the week by project, longest first, the time without a project in its own row', () => {
		const { entries } = weekOf(WEEK_LOGS);
		const projects = myWeekProjectsOf(entries);

		expect(projects.map((project) => [project.name, project.seconds, project.isNoProject])).toEqual([
			['Website', 7 * HOUR, false],
			['Support', 1.5 * HOUR, false],
			[null, 0.5 * HOUR, true]
		]);
		expect(namedProjectCountOf(projects)).toBe(2);
	});

	it('adds up to the week total', () => {
		const { entries, figures } = weekOf(WEEK_LOGS);
		const projectsTotal = myWeekProjectsOf(entries).reduce((total, project) => total + project.seconds, 0);

		expect(projectsTotal).toBe(figures.trackedSeconds);
	});

	it('lists a project that came without a name with the time tracked without a project', () => {
		const unnamed = log('unnamed', new Date(2026, 10, 9, 9, 0), new Date(2026, 10, 9, 10, 0), {
			projectId: 'project-gone',
			projectName: '  '
		});
		const { entries } = weekOf([unnamed, ...WEEK_LOGS]);
		const projects = myWeekProjectsOf(entries);
		const withoutProject = projects.filter((project) => project.isNoProject);

		expect(withoutProject).toHaveLength(1);
		expect(withoutProject[0]?.seconds).toBe(1.5 * HOUR);
	});
});

describe('projectsInMinutesOf', () => {
	it('writes the projects in whole minutes that add up to the total as it is written', () => {
		const logs = [
			log('first', new Date(2026, 10, 9, 9, 0, 0), new Date(2026, 10, 9, 9, 20, 59), {
				projectId: 'project-a',
				projectName: 'Alpha'
			}),
			log('second', new Date(2026, 10, 9, 10, 0, 0), new Date(2026, 10, 9, 10, 20, 59), {
				projectId: 'project-b',
				projectName: 'Beta'
			}),
			log('third', new Date(2026, 10, 9, 11, 0, 0), new Date(2026, 10, 9, 11, 20, 59), {
				projectId: 'project-c',
				projectName: 'Gamma'
			})
		];
		const { entries, figures } = weekOf(logs);
		const projects = projectsInMinutesOf(myWeekProjectsOf(entries));
		const writtenSeconds = projects.reduce((total, project) => total + project.seconds, 0);

		expect(formatDurationShort(figures.trackedSeconds)).toBe('1h 2m');
		expect(projects.map((project) => formatDurationShort(project.seconds))).toEqual(['0h 21m', '0h 21m', '0h 20m']);
		expect(formatDurationShort(writtenSeconds)).toBe('1h 2m');
	});

	it('leaves times that are whole minutes as they are', () => {
		const { entries } = weekOf(WEEK_LOGS);
		const projects = myWeekProjectsOf(entries);

		expect(projectsInMinutesOf(projects)).toEqual(projects);
	});
});

describe('weeklyLimitSecondsOf', () => {
	it('reads the hours of the profile, as a number or as the text some databases return', () => {
		expect(weeklyLimitSecondsOf(40)).toBe(40 * HOUR);
		expect(weeklyLimitSecondsOf('37.5')).toBe(37.5 * HOUR);
	});

	it('is null for a member without a weekly limit, which a cleared limit is too', () => {
		expect(weeklyLimitSecondsOf(0)).toBeNull();
		expect(weeklyLimitSecondsOf(null)).toBeNull();
		expect(weeklyLimitSecondsOf(undefined)).toBeNull();
		expect(weeklyLimitSecondsOf('')).toBeNull();
		expect(weeklyLimitSecondsOf(-5)).toBeNull();
	});
});

describe('dailyLimitSecondsOf', () => {
	it('is a fifth of the weekly limit, and nothing without one', () => {
		expect(dailyLimitSecondsOf(40 * HOUR)).toBe(8 * HOUR);
		expect(dailyLimitSecondsOf(null)).toBeNull();
	});
});

describe('myWeekTargetOf', () => {
	const LIMIT = 40 * HOUR;

	it('measures a week against the weekly limit', () => {
		expect(myWeekTargetOf('thisWeek', LIMIT, 30 * HOUR)).toEqual({
			limitSeconds: LIMIT,
			usedSeconds: 30 * HOUR,
			share: 75,
			verdict: 'within',
			remainingSeconds: 10 * HOUR
		});
		expect(myWeekTargetOf('lastWeek', LIMIT, 37 * HOUR)?.verdict).toBe('near');
	});

	it('says by how much the limit is passed', () => {
		const target = myWeekTargetOf('thisWeek', LIMIT, 42 * HOUR);

		expect(target?.verdict).toBe('over');
		expect(target?.remainingSeconds).toBe(-2 * HOUR);
	});

	it('gives no target to a member without a weekly limit', () => {
		expect(myWeekTargetOf('thisWeek', null, 30 * HOUR)).toBeNull();
	});

	it('gives no target to a month: the limit is a weekly one', () => {
		expect(myWeekTargetOf('thisMonth', LIMIT, 120 * HOUR)).toBeNull();
	});
});

describe('taskIdOfEntry', () => {
	it('names the task an entry was tracked on, or none', () => {
		const { entries } = weekOf(WEEK_LOGS);
		const byId = new Map(entries.map((entry) => [entry.id, entry]));
		const design = byId.get('monday-design');
		const notes = byId.get('wednesday-notes');

		expect(design && taskIdOfEntry(design)).toBe('task-1');
		expect(notes && taskIdOfEntry(notes)).toBeNull();
	});
});
