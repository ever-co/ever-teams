/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { WorkDiaryPageState } from '@/core/hooks/dashboards/work-diary/use-work-diary-page';
import type { CalendarDay, CalendarEntry } from '@/core/lib/utils/calendar-view';
import type { AppActivity } from '@/core/lib/utils/dashboards/app-activity';
import { type DiaryDay, type DiarySlot, diaryTaskCountOf, diaryTasksOf } from '@/core/lib/utils/dashboards/work-diary';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

let mockState: WorkDiaryPageState;

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
jest.mock('next/image', () => ({
	__esModule: true,
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />
}));
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
jest.mock('@/core/components/pages/profile/tracking-source-empty-state', () => ({
	TrackingSourceEmptyState: ({ label }: { label: string }) => <p>{label}</p>
}));
jest.mock('@/core/hooks/dashboards/work-diary/use-work-diary-page', () => ({
	useWorkDiaryPage: () => mockState
}));

import { WorkDiaryPage } from './work-diary-page';

const DAY = new Date(2026, 10, 10);

function logOf(id: string, taskId: string | null, title: string | null): ITimeLog {
	return { id, taskId: taskId ?? undefined, task: taskId ? { id: taskId, title } : undefined } as unknown as ITimeLog;
}

function entryOf(id: string, log: ITimeLog, daySeconds: number, projectName: string | null): CalendarEntry {
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
		taskTitle: log.task?.title ?? null,
		projectName,
		projectColor: null,
		reason: null
	};
}

const SLOT: DiarySlot = {
	id: 'slot-1',
	start: new Date(2026, 10, 10, 9, 0),
	end: new Date(2026, 10, 10, 9, 10),
	seconds: 600,
	activityPercent: 64,
	shots: [
		{
			id: 'shot-1',
			thumbUrl: 'https://shots.example/t.png',
			fullUrl: 'https://shots.example/f.png',
			recordedAt: null
		}
	]
};

const WITH_SLOT: DiaryDay = {
	hours: [{ hour: 9, seconds: 600, positions: [SLOT, null, null, null, null, null] }],
	seconds: 600,
	slotCount: 1,
	shotCount: 1,
	activityPercent: 64
};

const NO_SLOTS: DiaryDay = { hours: [], seconds: 0, slotCount: 0, shotCount: 0, activityPercent: null };

const ACTIVITIES: AppActivity[] = [
	{
		id: 'activity-1',
		title: 'Visual Studio Code',
		detail: 'work-diary-page.tsx',
		kind: 'app',
		start: new Date(2026, 10, 10, 9, 0),
		end: new Date(2026, 10, 10, 9, 10),
		seconds: 600,
		employeeId: 'employee-1',
		timeSlotId: 'slot-1'
	}
];

function dayWith(entries: CalendarEntry[]): CalendarDay {
	const trackedSeconds = entries.reduce((total, entry) => total + entry.daySeconds, 0);
	return {
		key: '2026-11-10',
		date: DAY,
		entries,
		trackedSeconds,
		manualSeconds: 0,
		plan: {
			expectedSeconds: 8 * 3600,
			isFromEstimates: false,
			tasks: [{ id: 'task-1', title: 'Write the diary', estimateSeconds: 3600 }]
		}
	};
}

function stateOf(overrides: Partial<WorkDiaryPageState> = {}): WorkDiaryPageState {
	const entries = [
		entryOf('log-1', logOf('log-1', 'task-1', 'Write the diary'), 3000, 'Ever Teams'),
		entryOf('log-2', logOf('log-2', null, null), 1200, null)
	];
	const shownDay = dayWith(entries);
	return {
		day: DAY,
		dayKey: '2026-11-10',
		isToday: false,
		history: { from: new Date(2000, 0, 1), to: new Date(2026, 10, 11) },
		stripDays: [new Date(2026, 10, 9), DAY, new Date(2026, 10, 11)],
		trackedKeys: new Set(['2026-11-10']),
		shownDay,
		tasks: diaryTasksOf(entries),
		taskCount: diaryTaskCountOf(diaryTasksOf(entries)),
		diary: {
			diary: WITH_SLOT,
			activities: ACTIVITIES,
			isAppsLoading: false,
			isLoading: false,
			isError: false,
			refetch: jest.fn()
		},
		isMemberUnknown: false,
		isLogsLoading: false,
		isLogsError: false,
		refetchLogs: jest.fn(),
		isPlanLoading: false,
		isPlanError: false,
		refetchPlans: jest.fn(),
		isUpdating: false,
		timesheetsPath: null,
		pickDay: jest.fn(),
		showToday: jest.fn(),
		...overrides
	} as unknown as WorkDiaryPageState;
}

describe('WorkDiaryPage', () => {
	beforeEach(() => {
		mockState = stateOf();
		// The notices' orb asks whether motion is reduced; jsdom has no matchMedia
		window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
	});

	it('shows the day: its figures, the tasks the time went to, the plan, the apps and the screenshots by hour', () => {
		render(<WorkDiaryPage />);

		const figures = screen.getByRole('region', { name: 'dashboard.workDiary.FIGURES_LABEL' });
		expect(within(figures).getByText('1h 10m')).toBeTruthy();
		const tasks = screen.getByRole('region', { name: 'common.TASKS' });
		expect(within(tasks).getByText('Write the diary')).toBeTruthy();
		expect(within(tasks).getByText('Ever Teams')).toBeTruthy();
		expect(within(tasks).getByText('dashboard.timesheets.NO_TASK')).toBeTruthy();
		expect(screen.getByRole('region', { name: 'dashboard.calendar.PLAN_TITLE' })).toBeTruthy();
		const apps = screen.getByRole('region', { name: 'dashboard.timesheets.diary.APPS' });
		expect(within(apps).getByText('Visual Studio Code')).toBeTruthy();
		// The time tracked without a task is listed, but it is not a task
		expect(within(tasks).getByText('dashboard.timesheets.SHEET.TASK_COUNT:{"count":1}')).toBeTruthy();
		const shots = screen.getByRole('region', { name: 'common.SCREENSHOTS' });
		expect(within(shots).getByRole('button', { name: /^dashboard\.timesheets\.diary\.SLOT_LABEL/ })).toBeTruthy();
	});

	it('says once that no time was tracked on an empty day, and how to fill it on today', () => {
		mockState = stateOf({
			isToday: true,
			shownDay: { ...dayWith([]), plan: null },
			tasks: [],
			diary: { ...stateOf().diary, diary: NO_SLOTS, activities: [] }
		});
		render(<WorkDiaryPage />);

		expect(screen.getAllByText(/^dashboard\.timesheets\.diary\.NO_TIME_TITLE/)).toHaveLength(1);
		expect(screen.getByText('dashboard.workDiary.NO_TIME_HINT')).toBeTruthy();
		expect(screen.queryByRole('region', { name: 'common.SCREENSHOTS' })).toBeNull();
	});

	it('says why a day of time added by hand has no screenshots, and still lists its tasks', () => {
		mockState = stateOf({ diary: { ...stateOf().diary, diary: NO_SLOTS, activities: [] } });
		render(<WorkDiaryPage />);

		expect(screen.getByText(/^dashboard\.timesheets\.diary\.NO_SHOTS_TITLE/)).toBeTruthy();
		const tasks = screen.getByRole('region', { name: 'common.TASKS' });
		expect(within(tasks).getByText('Write the diary')).toBeTruthy();
		expect(screen.getByText(/^dashboard\.workDiary\.APPS_EMPTY/)).toBeTruthy();
	});

	it('lists every task of the day, each with its name, however many there are', () => {
		const entries = Array.from({ length: 8 }, (_, index) =>
			entryOf(
				`log-${index}`,
				logOf(`log-${index}`, `task-${index}`, `Task number ${index}`),
				600 + index * 60,
				null
			)
		);
		mockState = stateOf({
			shownDay: dayWith(entries),
			tasks: diaryTasksOf(entries),
			taskCount: diaryTaskCountOf(diaryTasksOf(entries))
		});
		render(<WorkDiaryPage />);

		const tasks = screen.getByRole('region', { name: 'common.TASKS' });
		for (let index = 0; index < 8; index += 1) {
			expect(within(tasks).getByText(`Task number ${index}`)).toBeTruthy();
		}
	});

	it('keeps the plan card loading while the plans load, and offers to retry when they failed', () => {
		mockState = stateOf({ isPlanLoading: true });
		const { unmount } = render(<WorkDiaryPage />);
		expect(screen.queryByText('dashboard.calendar.NO_PLAN')).toBeNull();
		expect(screen.queryByRole('region', { name: 'dashboard.calendar.PLAN_TITLE' })).toBeNull();
		unmount();

		mockState = stateOf({ isPlanError: true, shownDay: { ...stateOf().shownDay, plan: null } });
		render(<WorkDiaryPage />);
		expect(screen.queryByText('dashboard.calendar.NO_PLAN')).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'pages.unauthorized.TRY_AGAIN' }));
		expect(mockState.refetchPlans).toHaveBeenCalled();
	});

	it('picks a day from the strip and goes back to today', () => {
		render(<WorkDiaryPage />);

		const strip = screen.getByRole('list', { name: 'dashboard.timesheets.diary.DAY_STRIP' });
		fireEvent.click(within(strip).getAllByRole('button')[0]);
		expect(mockState.pickDay).toHaveBeenCalledWith(new Date(2026, 10, 9));

		fireEvent.click(screen.getByRole('button', { name: 'common.TODAY' }));
		expect(mockState.showToday).toHaveBeenCalled();
	});

	it("offers a manager the team's timesheets, and no one else", () => {
		mockState = stateOf({ timesheetsPath: '/reports/timesheet/user-1?name=Ruslan' });
		const { unmount } = render(<WorkDiaryPage />);
		expect(screen.getByRole('link', { name: 'dashboard.workDiary.OPEN_TIMESHEETS' }).getAttribute('href')).toBe(
			'/reports/timesheet/user-1?name=Ruslan'
		);
		unmount();

		mockState = stateOf({ timesheetsPath: null });
		render(<WorkDiaryPage />);
		expect(screen.queryByRole('link', { name: 'dashboard.workDiary.OPEN_TIMESHEETS' })).toBeNull();
	});

	it('explains an account without a member profile instead of an empty day', () => {
		mockState = stateOf({ isMemberUnknown: true });
		render(<WorkDiaryPage />);

		expect(screen.getByText('dashboard.calendar.NO_MEMBER_TITLE')).toBeTruthy();
		expect(screen.queryByRole('region', { name: 'common.TASKS' })).toBeNull();
	});
});
