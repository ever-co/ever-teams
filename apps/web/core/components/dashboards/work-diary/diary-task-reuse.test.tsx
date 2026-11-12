/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';

import type { CalendarEntry } from '@/core/lib/utils/calendar-view';
import { type DiaryTask, diaryTasksOf } from '@/core/lib/utils/dashboards/work-diary';
import { activeTeamIdState, organizationTeamsState, teamTasksState } from '@/core/stores';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockCanContinue = jest.fn();
const mockContinueLog = jest.fn();
const mockOpenDuplicate = jest.fn();
const mockCloseDuplicate = jest.fn();
const mockCheckBeforeSave = jest.fn();
const mockRefusalOfOverlap = jest.fn();
const mockAddTimeDialog = jest.fn();
const mockStartLayer = jest.fn();

let mockDuplicateDraft: Record<string, unknown> | null = null;
let mockIsTeamManager = false;
let mockIsDuplicateOpen = false;

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}:${JSON.stringify(values)}` : key
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: { id: 'user-1' } }) }));
jest.mock('@/core/hooks/organizations/teams/use-team-member', () => ({
	useIsMemberManager: () => ({ isTeamManager: mockIsTeamManager })
}));
jest.mock('@/core/components/common/dropdown-menu', () => ({
	DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
	DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
	DropdownMenuContent: ({ children }: { children: ReactNode }) => <div role="menu">{children}</div>,
	DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
		<button type="button" role="menuitem" onClick={onClick}>
			{children}
		</button>
	),
	DropdownMenuSeparator: () => <hr />
}));
jest.mock('@/core/components/common/skeleton/calendar-component-skeletons', () => ({
	AddManualTimeModalSkeleton: () => null
}));
jest.mock('@/core/components/optimized-components/calendar', () => ({
	LazyAddManualTimeModal: (props: Record<string, unknown>) => {
		mockAddTimeDialog(props);
		return <div role="dialog" />;
	}
}));
jest.mock('@/core/components/timer/timer-task-start', () => ({
	TimerTaskStartLayer: (props: Record<string, unknown>) => {
		mockStartLayer(props);
		return null;
	}
}));
jest.mock('@/core/hooks/timer/use-timer-task-start', () => ({
	useTimerTaskStart: () => ({ request: { id: 7 }, startOn: jest.fn() })
}));
jest.mock('@/core/hooks/timer/use-time-entry-continue', () => ({
	useTimeEntryContinue: () => ({ canContinue: mockCanContinue, continueLog: mockContinueLog })
}));
jest.mock('@/core/hooks/timesheet/use-time-entry-duplicate', () => ({
	useTimeEntryDuplicate: () => ({
		draft: mockDuplicateDraft,
		isOpen: mockIsDuplicateOpen,
		open: mockOpenDuplicate,
		close: mockCloseDuplicate,
		checkBeforeSave: mockCheckBeforeSave,
		refusalOfOverlap: mockRefusalOfOverlap
	})
}));

import { DiaryTaskReuseLayers, useDiaryTaskReuse } from './diary-task-reuse';

function logOf(id: string, taskId: string | null, hour: number): ITimeLog {
	const task = taskId ? { id: taskId, title: `Title of ${taskId}` } : undefined;
	return {
		id,
		taskId: taskId ?? undefined,
		task,
		startedAt: new Date(2026, 10, 10, hour)
	} as unknown as ITimeLog;
}

function entryOf(log: ITimeLog, daySeconds: number): CalendarEntry {
	return {
		id: log.id,
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
		projectName: null,
		projectColor: null,
		projectKey: null,
		reason: null
	};
}

const EARLY = logOf('log-early', 'task-1', 9);
const LATE = logOf('log-late', 'task-1', 14);
const UNTASKED = logOf('log-untasked', null, 11);

const ENTRIES = [entryOf(EARLY, 1800), entryOf(LATE, 2700), entryOf(UNTASKED, 600)];

function taskOf(key: string): DiaryTask {
	const task = diaryTasksOf(ENTRIES).find((item) => item.key === key);
	if (!task) {
		throw new Error(`No task ${key} in the day`);
	}
	return task;
}

/** The task as the Work diary's Add time dialog lists it: one of the active team's, assigned to the member. */
const LISTED_TASK = {
	id: 'task-1',
	title: 'Title of task-1',
	teams: [{ id: 'team-1' }],
	members: [{ userId: 'user-1' }]
};

function storeListing(tasks: unknown[]) {
	const store = createStore();
	store.set(organizationTeamsState, [{ id: 'team-1', members: [] }] as never);
	store.set(activeTeamIdState, 'team-1');
	store.set(teamTasksState, tasks as never);
	return store;
}

let testStore = storeListing([LISTED_TASK]);

function HarnessBody({ task }: Readonly<{ task: DiaryTask }>) {
	const reuse = useDiaryTaskReuse(ENTRIES);
	return (
		<>
			{reuse.renderTaskActions(task)}
			<DiaryTaskReuseLayers reuse={reuse} />
		</>
	);
}

function Harness({ task }: Readonly<{ task: DiaryTask }>) {
	return (
		<Provider store={testStore}>
			<HarnessBody task={task} />
		</Provider>
	);
}

beforeEach(() => {
	testStore = storeListing([LISTED_TASK]);
	mockIsTeamManager = false;
	mockCanContinue.mockReturnValue(true);
	mockDuplicateDraft = null;
	mockIsDuplicateOpen = false;
});

afterEach(() => {
	jest.clearAllMocks();
});

describe('the actions of a task of a Work diary day', () => {
	it('names the menu after its task', () => {
		render(<Harness task={taskOf('task-1')} />);

		const trigger = screen.getByRole('button', {
			name: 'timeEntryActions.TASK_ACTIONS:{"task":"Title of task-1"}'
		});
		expect(trigger).toBeTruthy();
	});

	it('gives no menu to the time tracked without a task', () => {
		render(<Harness task={taskOf('no-task')} />);

		expect(screen.queryByRole('menu')).toBeNull();
	});

	it("continues the task's latest entry of the day", () => {
		render(<Harness task={taskOf('task-1')} />);

		fireEvent.click(screen.getByRole('menuitem', { name: 'timeEntryActions.CONTINUE' }));

		expect(mockCanContinue).toHaveBeenCalledWith(LATE);
		expect(mockContinueLog).toHaveBeenCalledWith(LATE);
	});

	it('leaves Continue out where the entry cannot be continued, and keeps Duplicate', () => {
		mockCanContinue.mockReturnValue(false);
		render(<Harness task={taskOf('task-1')} />);

		expect(screen.queryByRole('menuitem', { name: 'timeEntryActions.CONTINUE' })).toBeNull();
		expect(screen.getByRole('menuitem', { name: 'timeEntryActions.DUPLICATE' })).toBeTruthy();
	});

	it('leaves Duplicate out on a task the Add time dialog no longer lists for the member, and keeps Continue', () => {
		const unassigned = { ...LISTED_TASK, members: [] };
		testStore = storeListing([unassigned]);
		render(<Harness task={taskOf('task-1')} />);

		expect(screen.queryByRole('menuitem', { name: 'timeEntryActions.DUPLICATE' })).toBeNull();
		expect(screen.getByRole('menuitem', { name: 'timeEntryActions.CONTINUE' })).toBeTruthy();
	});

	it('keeps Duplicate on a task of the team that is not assigned to a manager, whose dialog lists every task', () => {
		mockIsTeamManager = true;
		testStore = storeListing([{ ...LISTED_TASK, members: [] }]);
		render(<Harness task={taskOf('task-1')} />);

		expect(screen.getByRole('menuitem', { name: 'timeEntryActions.DUPLICATE' })).toBeTruthy();
	});

	it('gives no menu when the task can neither be continued nor copied', () => {
		mockCanContinue.mockReturnValue(false);
		testStore = storeListing([]);
		render(<Harness task={taskOf('task-1')} />);

		expect(screen.queryByRole('button', { name: /timeEntryActions\.TASK_ACTIONS/ })).toBeNull();
	});

	it("copies the latest entry with the time the row shows, the task's whole time of the day", () => {
		render(<Harness task={taskOf('task-1')} />);

		fireEvent.click(screen.getByRole('menuitem', { name: 'timeEntryActions.DUPLICATE' }));

		expect(mockOpenDuplicate).toHaveBeenCalledWith({ log: LATE, seconds: 4500 });
	});

	it('hands the start it asked to the timer layer', () => {
		render(<Harness task={taskOf('task-1')} />);

		expect(mockStartLayer).toHaveBeenCalledWith({ request: { id: 7 } });
	});

	it('opens Add time on the copy, with the check a copy must pass before it is saved', () => {
		const start = new Date(2026, 10, 12, 14, 7);
		const end = new Date(2026, 10, 12, 15, 37);
		mockDuplicateDraft = { id: 3, taskId: 'task-1', description: 'Pairing', isBillable: true, start, end };
		mockIsDuplicateOpen = true;

		render(<Harness task={taskOf('task-1')} />);

		expect(screen.getByRole('dialog')).toBeTruthy();
		expect(mockAddTimeDialog).toHaveBeenCalledWith(
			expect.objectContaining({
				isOpen: true,
				params: 'AddTime',
				initialStart: start,
				initialEnd: end,
				prefill: mockDuplicateDraft,
				checkBeforeSave: mockCheckBeforeSave,
				refusalOfOverlap: mockRefusalOfOverlap,
				closeModal: mockCloseDuplicate
			})
		);
	});

	it('mounts no Add time dialog while no copy is open', () => {
		render(<Harness task={taskOf('task-1')} />);

		expect(screen.queryByRole('dialog')).toBeNull();
	});
});
