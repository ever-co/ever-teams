/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { MyWeekPageState } from '@/core/hooks/dashboards/my-week/use-my-week-page';
import type { MyWeekDay, MyWeekEntry, MyWeekTarget } from '@/core/lib/utils/dashboards/my-week';
import type { ProjectShareItem } from '@/core/lib/utils/dashboards/team';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

let mockState: MyWeekPageState;
let mockCanTrackTime = true;
let mockTeamTasks: Array<{ id: string; title: string }> = [];

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values && Object.keys(values).length > 0 ? `${key}:${JSON.stringify(values)}` : key,
	useLocale: () => 'en'
}));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
		<a href={href} {...props}>
			{children}
		</a>
	)
}));
jest.mock('next/dynamic', () => ({
	__esModule: true,
	default: () =>
		function EntryStartStub({ task }: { task: { id: string } }) {
			return <button type="button">{`start:${task.id}`}</button>;
		}
}));
jest.mock('jotai', () => ({
	useAtomValue: (atom: unknown) => {
		if (atom === 'tracking-enabled-atom') {
			return true;
		}
		return mockTeamTasks;
	}
}));
jest.mock('@/core/stores/timer/active-timer', () => ({ isTrackingEnabledState: 'tracking-enabled-atom' }));
jest.mock('@/core/stores/teams/team-tasks', () => ({ teamTasksState: 'team-tasks-atom' }));
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({ children, mainHeaderSlot }: { children: ReactNode; mainHeaderSlot?: ReactNode }) => (
		<main>
			{mainHeaderSlot}
			{children}
		</main>
	)
}));
jest.mock('@/core/components/duplicated-components/breadcrumb', () => ({ Breadcrumb: () => null }));
jest.mock('@/core/components/dashboards/timesheets/timesheet-log-row', () => ({
	TaskTitle: ({ log }: { log: ITimeLog }) => <span>{log.task?.title ?? 'dashboard.timesheets.NO_TASK'}</span>
}));
jest.mock('@/core/components/dashboards/kit/day-bars-chart', () => ({
	DayBarsChart: ({
		data,
		ariaLabel,
		limitLabel
	}: {
		data: Array<{ key: string; axisLabel: string; value: number }>;
		ariaLabel: string;
		limitLabel?: string;
	}) => (
		<ol aria-label={ariaLabel}>
			{data.map((datum) => (
				<li key={datum.key}>{`${datum.axisLabel}:${datum.value}`}</li>
			))}
			{limitLabel && <li>{limitLabel}</li>}
		</ol>
	)
}));
jest.mock('@/core/hooks/dashboards/my-week/use-my-week-page', () => ({
	useMyWeekPage: () => mockState
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: { id: 'user-1' } }) }));
jest.mock('@/core/hooks/organizations/teams/use-active-team-member', () => ({
	useIsTrackingEnabledFor: () => mockCanTrackTime
}));

import { MyWeekPage } from './my-week-page';

const HOUR = 3600;

function logOf(id: string, taskId: string | null, title: string | null): ITimeLog {
	return {
		id,
		startedAt: new Date(2026, 10, 10, 9, 0),
		stoppedAt: new Date(2026, 10, 10, 10, 0),
		taskId: taskId ?? undefined,
		task: taskId ? { id: taskId, title } : undefined
	} as unknown as ITimeLog;
}

function entryOf(id: string, log: ITimeLog, seconds: number, projectName: string | null = null): MyWeekEntry {
	return {
		id,
		log,
		start: new Date(2026, 10, 10, 9, 0),
		dayKey: '2026-11-10',
		seconds,
		isRunning: false,
		isBillable: false,
		project: projectName ? { id: `project-${id}`, name: projectName, color: null, imageUrl: null } : null
	};
}

const DAYS: MyWeekDay[] = [9, 10, 11, 12, 13, 14, 15].map((dayOfMonth) => ({
	key: `2026-11-${String(dayOfMonth).padStart(2, '0')}`,
	date: new Date(2026, 10, dayOfMonth),
	seconds: dayOfMonth === 10 ? 8 * HOUR : 0,
	isToday: dayOfMonth === 11,
	isFuture: dayOfMonth > 11
}));

const PROJECTS: ProjectShareItem[] = [
	{ key: 'project-web', name: 'Website', imageUrl: null, color: '#3b82f6', isNoProject: false, seconds: 20 * HOUR },
	{ key: '__no-project__', name: null, imageUrl: null, color: null, isNoProject: true, seconds: 3 * HOUR + 2400 }
];

const ENTRIES: MyWeekEntry[] = [
	entryOf('log-known', logOf('log-known', 'task-known', 'Write the report'), 2 * HOUR, 'Mobile app'),
	entryOf('log-elsewhere', logOf('log-elsewhere', 'task-elsewhere', 'Task of another team'), HOUR),
	entryOf('log-untasked', logOf('log-untasked', null, null), 1800)
];

const WITHIN_TARGET: MyWeekTarget = {
	limitSeconds: 40 * HOUR,
	usedSeconds: 23 * HOUR + 2400,
	share: 59.17,
	verdict: 'within',
	remainingSeconds: 16 * HOUR + 1200
};

function stateOf(overrides: Partial<MyWeekPageState> = {}): MyWeekPageState {
	return {
		periodKey: 'thisWeek',
		pickPeriod: jest.fn(),
		shownKey: 'thisWeek',
		shownPeriod: { from: new Date(2026, 10, 9), to: new Date(2026, 10, 15, 23, 59, 59) },
		days: DAYS,
		figures: {
			trackedSeconds: 23 * HOUR + 2400,
			billableSeconds: 18 * HOUR + 1800,
			billableShare: 78.2,
			todaySeconds: 3 * HOUR + 1200
		},
		target: WITHIN_TARGET,
		weeklyLimitSeconds: 40 * HOUR,
		dailyLimitSeconds: 8 * HOUR,
		projects: PROJECTS,
		recentEntries: ENTRIES,
		entryCount: ENTRIES.length,
		isMemberUnknown: false,
		isLoading: false,
		showsError: false,
		isUpdating: false,
		isEmpty: false,
		refetch: jest.fn(),
		...overrides
	} as MyWeekPageState;
}

function summary() {
	return screen.getByRole('region', { name: 'dashboard.myWeek.SUMMARY_LABEL' });
}

describe('MyWeekPage', () => {
	beforeEach(() => {
		mockState = stateOf();
		mockCanTrackTime = true;
		mockTeamTasks = [{ id: 'task-known', title: 'Write the report' }];
		// The notices' orb asks whether motion is reduced; jsdom has no matchMedia
		window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
	});

	it('shows the week against the weekly limit, with today, the billable share and a bar per day', () => {
		render(<MyWeekPage />);

		const figures = summary();
		expect(within(figures).getByText('dashboard.myWeek.TRACKED_THIS_WEEK')).toBeTruthy();
		expect(
			within(figures).getByText('dashboard.weeklyLimit.CELL_USED_OF:{"used":"23h 40m","limit":"40h"}')
		).toBeTruthy();
		expect(within(figures).getByText('dashboard.myWeek.LIMIT_LEFT:{"duration":"16h 20m"}')).toBeTruthy();
		expect(within(figures).getByText('dashboard.myWeek.LIMIT_SHARE:{"percent":"59%"}')).toBeTruthy();
		expect(within(figures).getByText('3h 20m')).toBeTruthy();
		expect(within(figures).getByText('78%')).toBeTruthy();
		expect(within(figures).getByText('18h 30m')).toBeTruthy();

		const days = within(figures).getByRole('list', { name: 'dashboard.team.cards.TIME_BY_DAY' });
		expect(within(days).getAllByRole('listitem')).toHaveLength(8);
		expect(within(days).getByText('Tue:28800')).toBeTruthy();
		expect(within(days).getByText('dashboard.myWeek.DAILY_LIMIT_LINE:{"limit":"8h"}')).toBeTruthy();
	});

	it('splits the time by project and lists the latest entries', () => {
		render(<MyWeekPage />);

		const projects = screen.getByRole('region', { name: 'dashboard.myWeek.PROJECTS_TITLE' });
		expect(within(projects).getByText('Website')).toBeTruthy();
		expect(within(projects).getByText('20h 0m')).toBeTruthy();
		expect(within(projects).getByText('dashboard.timesheets.NO_PROJECT')).toBeTruthy();
		expect(within(projects).getByText('3h 40m')).toBeTruthy();
		expect(within(projects).getByText('dashboard.team.projects.COUNT:{"count":1}')).toBeTruthy();

		const recent = screen.getByRole('region', { name: 'dashboard.myWeek.RECENT_TITLE' });
		expect(within(recent).getByText('Write the report')).toBeTruthy();
		expect(within(recent).getByText('Mobile app')).toBeTruthy();
		expect(within(recent).getByText('2h 0m')).toBeTruthy();
		expect(within(recent).getByText('dashboard.timesheets.NO_TASK')).toBeTruthy();
		expect(within(recent).getByText('dashboard.calendar.ENTRY_COUNT:{"count":3}')).toBeTruthy();
	});

	it('says how many entries the period holds when it lists only the latest', () => {
		mockState = stateOf({ entryCount: 23 });
		render(<MyWeekPage />);

		expect(screen.getByText('dashboard.myWeek.RECENT_LATEST:{"shown":3,"total":23}')).toBeTruthy();
	});

	it('writes a running entry up to now, whatever end the API last recorded', () => {
		const running: MyWeekEntry = { ...ENTRIES[0], id: 'log-running', isRunning: true };
		mockState = stateOf({ recentEntries: [running], entryCount: 1 });
		render(<MyWeekPage />);

		const recent = screen.getByRole('region', { name: 'dashboard.myWeek.RECENT_TITLE' });
		expect(within(recent).getByText(/ – dashboard\.timesheets\.RUNNING$/)).toBeTruthy();
	});

	it('shows the tracked time without a target to a member without a weekly limit, and no error', () => {
		mockState = stateOf({ target: null, weeklyLimitSeconds: null, dailyLimitSeconds: null });
		render(<MyWeekPage />);

		const figures = summary();
		expect(within(figures).getByText('23h 40m')).toBeTruthy();
		expect(within(figures).getByText('dashboard.myWeek.NO_LIMIT')).toBeTruthy();
		expect(within(figures).queryByText(/dashboard\.myWeek\.LIMIT_(LEFT|UNDER|OVER|SHARE)/)).toBeNull();
		expect(within(figures).queryByText(/dashboard\.myWeek\.DAILY_LIMIT/)).toBeNull();
		expect(screen.queryByText('dashboard.states.ERROR_TITLE')).toBeNull();
	});

	it('says in words when the week is close to its limit or past it', () => {
		const near: MyWeekTarget = { ...WITHIN_TARGET, usedSeconds: 37 * HOUR, share: 92.5, verdict: 'near' };
		mockState = stateOf({ target: { ...near, remainingSeconds: 3 * HOUR } });
		const { unmount } = render(<MyWeekPage />);
		expect(within(summary()).getByText('dashboard.weeklyLimit.VERDICT_NEAR')).toBeTruthy();
		unmount();

		const over: MyWeekTarget = { ...WITHIN_TARGET, usedSeconds: 42 * HOUR, share: 105, verdict: 'over' };
		mockState = stateOf({ target: { ...over, remainingSeconds: -2 * HOUR } });
		render(<MyWeekPage />);
		expect(within(summary()).getByText('dashboard.weeklyLimit.VERDICT_OVER')).toBeTruthy();
		expect(within(summary()).getByText('dashboard.myWeek.LIMIT_OVER:{"duration":"2h 0m"}')).toBeTruthy();
	});

	it('measures last week as a finished week, and a month against no limit', () => {
		mockState = stateOf({ shownKey: 'lastWeek', figures: { ...stateOf().figures, todaySeconds: null } });
		const { unmount } = render(<MyWeekPage />);
		expect(within(summary()).getByText('dashboard.myWeek.TRACKED_LAST_WEEK')).toBeTruthy();
		expect(within(summary()).getByText('dashboard.myWeek.LIMIT_UNDER:{"duration":"16h 20m"}')).toBeTruthy();
		expect(within(summary()).queryByText('common.TODAY')).toBeNull();
		unmount();

		mockState = stateOf({ shownKey: 'thisMonth', target: null });
		render(<MyWeekPage />);
		expect(within(summary()).getByText('dashboard.myWeek.TRACKED_THIS_MONTH')).toBeTruthy();
		expect(within(summary()).getByText('dashboard.myWeek.LIMIT_BY_WEEK:{"limit":"40h"}')).toBeTruthy();
	});

	it('switches to last week and to this month', () => {
		render(<MyWeekPage />);

		const periods = screen.getByRole('tablist', { name: 'dashboard.period.LABEL' });
		expect(within(periods).getByRole('tab', { name: 'common.THIS_WEEK' }).getAttribute('aria-selected')).toBe(
			'true'
		);
		fireEvent.click(within(periods).getByRole('tab', { name: 'common.LAST_WEEK' }));
		expect(mockState.pickPeriod).toHaveBeenCalledWith('lastWeek');
		fireEvent.click(within(periods).getByRole('tab', { name: 'common.THIS_MONTH' }));
		expect(mockState.pickPeriod).toHaveBeenCalledWith('thisMonth');
	});

	it('starts the timer from an entry whose task the active team holds, and from no other entry', () => {
		render(<MyWeekPage />);

		const recent = screen.getByRole('region', { name: 'dashboard.myWeek.RECENT_TITLE' });
		expect(within(recent).getAllByRole('button')).toHaveLength(1);
		expect(within(recent).getByRole('button', { name: 'start:task-known' })).toBeTruthy();
	});

	it('offers no start where the member cannot track time', () => {
		mockCanTrackTime = false;
		render(<MyWeekPage />);

		const recent = screen.getByRole('region', { name: 'dashboard.myWeek.RECENT_TITLE' });
		expect(within(recent).queryByRole('button')).toBeNull();
		expect(within(recent).getByText('Write the report')).toBeTruthy();
	});

	it('points a member without time yet to the timer', () => {
		mockState = stateOf({ isEmpty: true, recentEntries: [], entryCount: 0, projects: [] });
		render(<MyWeekPage />);

		expect(screen.getByText('dashboard.myWeek.EMPTY_THIS_WEEK')).toBeTruthy();
		expect(screen.getByText('dashboard.myWeek.EMPTY_HINT')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'dashboard.myWeek.OPEN_TIMER' }).getAttribute('href')).toBe('/');
		expect(screen.queryByRole('region', { name: 'dashboard.myWeek.SUMMARY_LABEL' })).toBeNull();
	});

	it('does not point to the timer for a week that is over, or where tracking is off', () => {
		const emptyLastWeek = stateOf({
			isEmpty: true,
			shownKey: 'lastWeek',
			figures: { ...stateOf().figures, todaySeconds: null }
		});
		mockState = emptyLastWeek;
		const { unmount } = render(<MyWeekPage />);
		expect(screen.getByText('dashboard.myWeek.EMPTY_LAST_WEEK')).toBeTruthy();
		expect(screen.queryByRole('link', { name: 'dashboard.myWeek.OPEN_TIMER' })).toBeNull();
		unmount();

		mockCanTrackTime = false;
		mockState = stateOf({ isEmpty: true });
		render(<MyWeekPage />);
		expect(screen.getByText('dashboard.myWeek.EMPTY_THIS_WEEK')).toBeTruthy();
		expect(screen.queryByText('dashboard.myWeek.EMPTY_HINT')).toBeNull();
		expect(screen.queryByRole('link', { name: 'dashboard.myWeek.OPEN_TIMER' })).toBeNull();
	});

	it('keeps the frame while the entries load, and offers a retry when the read failed', () => {
		mockState = stateOf({ isLoading: true });
		const { container, unmount } = render(<MyWeekPage />);
		expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
		expect(screen.queryByRole('region', { name: 'dashboard.myWeek.SUMMARY_LABEL' })).toBeNull();
		unmount();

		mockState = stateOf({ showsError: true });
		render(<MyWeekPage />);
		fireEvent.click(screen.getByRole('button', { name: 'pages.unauthorized.TRY_AGAIN' }));
		expect(mockState.refetch).toHaveBeenCalled();
		expect(screen.queryByRole('region', { name: 'dashboard.myWeek.SUMMARY_LABEL' })).toBeNull();
	});

	it('explains an account without a member profile instead of an empty week', () => {
		mockState = stateOf({ isMemberUnknown: true });
		render(<MyWeekPage />);

		expect(screen.getByText('dashboard.calendar.NO_MEMBER_TITLE')).toBeTruthy();
		expect(screen.queryByText('dashboard.myWeek.EMPTY_THIS_WEEK')).toBeNull();
	});

	it('has no member to pick: the page is about the signed-in person only', () => {
		render(<MyWeekPage />);

		expect(screen.queryByRole('combobox')).toBeNull();
		expect(screen.getAllByRole('tablist')).toHaveLength(1);
	});
});
