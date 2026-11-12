/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddManualTimeModal } from './add-manual-time-modal';

const mockAddManualTime = jest.fn();
const mockAtomValues: Record<string, unknown> = {};

type MockItem = Record<string, unknown>;

type MockManageOrMemberProps = {
	itemsLists: Record<string, MockItem[]>;
	handleChange: (field: string, item: MockItem | null) => void;
};

type MockCustomSelectProps = {
	ariaLabel?: string;
	options: Array<Record<string, unknown>>;
	value?: string;
	defaultValue?: string;
	valueKey?: string;
	onChange?: (value: string) => void;
};

jest.mock('jotai', () => ({
	useAtomValue: (atom: string) => mockAtomValues[atom]
}));

// The task list of a picked team that is not the active one (the store holds the active team's only)
const mockPickedTeamTasksQuery: { data?: { items: unknown[] } } = {};
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
	useQuery: (options: { queryKey: unknown; enabled?: boolean }) => {
		mockUseQuery(options);
		return mockPickedTeamTasksQuery;
	}
}));
jest.mock('@/core/services/client/api/tasks/task.service', () => ({ taskService: { getTasks: jest.fn() } }));
jest.mock('@/core/hooks/auth/use-reactive-access-token-cookie', () => ({
	useReactiveAccessTokenCookie: () => 'access-token'
}));

jest.mock('@/core/stores', () => ({
	activeTeamState: 'activeTeamState',
	activeTeamTaskState: 'activeTeamTaskState',
	organizationTeamsState: 'organizationTeamsState',
	tasksByTeamState: 'tasksByTeamState'
}));

jest.mock('@/core/hooks/activities/use-manual-time', () => ({
	useManualTime: () => ({
		addManualTime: mockAddManualTime,
		addManualTimeLoading: false,
		addManualTimeSuccess: false,
		addManualTimeError: false,
		addManualTimeErrorMessage: undefined,
		timeLog: undefined
	})
}));

type MockOverlapRequest = {
	employeeId: string;
	periods: Array<{ start: Date; end: Date }>;
	save: () => void | Promise<void>;
};

// The overlap lookup finds nothing unless a test holds the save: the guard has its own tests
const mockSaveAfterCheck = jest.fn((request: MockOverlapRequest) => request.save());
jest.mock('@/core/hooks/timesheet/use-time-overlap-guard', () => ({
	useTimeOverlapGuard: () => ({
		saveAfterCheck: mockSaveAfterCheck,
		isChecking: false,
		hasCheckFailed: false,
		isConfirmOpen: false,
		summary: { totalSeconds: 0, entries: [] },
		confirm: jest.fn(),
		cancel: jest.fn()
	})
}));
jest.mock('./time-overlap-confirm-dialog', () => ({
	TimeOverlapCheckError: () => null,
	TimeOverlapConfirmDialog: () => null
}));

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-1' } })
}));

jest.mock('@/core/hooks/organizations/teams/use-team-member', () => ({
	useIsMemberManager: () => ({ isTeamManager: true })
}));

// The keys stand for the texts; the list of missing fields is appended so each message stays distinct
function translate(key: string, values?: { fields?: string }) {
	if (values?.fields) {
		return `${key} ${values.fields}`;
	}
	return key;
}

jest.mock('next-intl', () => ({
	useTranslations: () => translate,
	useLocale: () => 'en'
}));

jest.mock('lucide-react', () => ({
	CalendarDays: () => null,
	Clock7: () => null
}));

jest.mock('@/core/constants/config/constants', () => ({ manualTimeReasons: [] }));

jest.mock('@/core/lib/helpers', () => ({ cn: () => '' }));

jest.mock('@/core/lib/utils', () => ({ clsxm: () => '' }));

jest.mock('@/core/components', () => ({
	Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => {
		const buttonProps = { ...props };
		delete buttonProps.loading;
		return <button {...buttonProps} />;
	},
	Modal: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

jest.mock('@/core/components/common/date-picker', () => ({ DatePicker: () => null }));

// The Calendar dialog picks its employee and its task through ManageOrMemberComponent: one button per listed item
function mockPickButtons(field: string, items: MockItem[], handleChange: MockManageOrMemberProps['handleChange']) {
	return items.map((item) => {
		const itemId = String(item.employeeId ?? item.id);
		return (
			<button key={itemId} type="button" onClick={() => handleChange(field, item)}>
				{`pick ${itemId}`}
			</button>
		);
	});
}

jest.mock('../../teams/manage-member-component', () => ({
	getNestedValue: () => '',
	ManageOrMemberComponent: ({ itemsLists, handleChange }: MockManageOrMemberProps) => (
		<>
			{mockPickButtons('Employee', itemsLists.Employee, handleChange)}
			{mockPickButtons('Task', itemsLists.Task, handleChange)}
		</>
	)
}));

// A select is either controlled or uncontrolled, so only one of the two props is passed on
function mockSelectValueProps(value?: string, defaultValue?: string) {
	if (value === undefined) {
		return { defaultValue };
	}
	return { value };
}

// A native select stands in for the Radix one: controlled through `value`, uncontrolled through `defaultValue`
jest.mock('../../common/multiple-select', () => ({
	CustomSelect: ({ ariaLabel, options, value, defaultValue, valueKey = 'id', onChange }: MockCustomSelectProps) => (
		<select
			aria-label={ariaLabel}
			{...mockSelectValueProps(value, defaultValue)}
			onChange={(event) => onChange?.(event.target.value)}
		>
			<option value="">Select an option</option>
			{options.map((option) => {
				const optionValue = String(option[valueKey]);
				return (
					<option key={optionValue} value={optionValue}>
						{optionValue}
					</option>
				);
			})}
		</select>
	)
}));

function teamWithMember(teamId: string, employeeId: string) {
	const member = { id: `${teamId}-member`, employeeId, employee: { id: employeeId, fullName: employeeId } };
	return { id: teamId, name: teamId, organizationId: 'org-1', projects: [], members: [member] };
}

const teamA = teamWithMember('team-a', 'employee-a');
const teamB = teamWithMember('team-b', 'employee-b');
const taskA = { id: 'task-a', title: 'Task A', teams: [{ id: 'team-a' }], members: [] };
const otherTaskA = { id: 'task-a-2', title: 'Task A 2', teams: [{ id: 'team-a' }], members: [] };
const sharedTask = { id: 'task-shared', title: 'Shared', teams: [{ id: 'team-a' }, { id: 'team-b' }], members: [] };
const taskB = { id: 'task-b', title: 'Task B', teams: [{ id: 'team-b' }], members: [] };

// The task list only holds the active team's tasks, and every load hands a new array
const teamATasks = () => [taskA, otherTaskA, sharedTask];
const teamBTasks = () => [taskB, sharedTask];

const closeModal = jest.fn();

function fillTimes(container: HTMLElement) {
	const timeInputs = container.querySelectorAll('input[type="time"]');
	const [startInput, endInput] = Array.from(timeInputs);
	fireEvent.change(startInput, { target: { value: '09:00' } });
	fireEvent.change(endInput, { target: { value: '11:00' } });
}

function renderAddTimeDialog() {
	const view = render(<AddManualTimeModal isOpen params="AddTime" closeModal={closeModal} />);
	fillTimes(view.container);
	return view;
}

// The Calendar opens the dialog for a manager, with an Employee field. A new element each time, so a rerender renders.
function calendarDialog() {
	return (
		<AddManualTimeModal isOpen params="AddManuelTime" timeSheetStatus="ManagerTimesheet" closeModal={closeModal} />
	);
}

function renderCalendarDialog() {
	const view = render(calendarDialog());
	fillTimes(view.container);
	return view;
}

function clickButton(name: string) {
	const button = screen.getByRole('button', { name });
	fireEvent.click(button);
}

// A task list refetch hands the dialog a new array, which re-runs its initialization effect
function refreshTaskList(rerender: ReturnType<typeof render>['rerender']) {
	mockAtomValues.tasksByTeamState = teamATasks();
	rerender(<AddManualTimeModal isOpen params="AddTime" closeModal={closeModal} />);
}

// Another tab switched the active team and this tab's team list refetched while the dialog is open
function switchActiveTeamToB(rerender: ReturnType<typeof render>['rerender']) {
	mockAtomValues.activeTeamState = teamB;
	mockAtomValues.activeTeamTaskState = null;
	mockAtomValues.tasksByTeamState = teamBTasks();
	rerender(<AddManualTimeModal isOpen params="AddTime" closeModal={closeModal} />);
}

function pickInSelect(ariaLabel: string, value: string) {
	const select = screen.getByLabelText(ariaLabel);
	fireEvent.change(select, { target: { value } });
}

function selectedValue(ariaLabel: string) {
	const select = screen.getByLabelText(ariaLabel) as HTMLSelectElement;
	return select.value;
}

function submitDialog() {
	clickButton('common.ADD_TIME');
}

describe('AddManualTimeModal opened on a copied entry', () => {
	const copiedStart = new Date(2026, 10, 12, 14, 7);
	const copiedEnd = new Date(2026, 10, 12, 15, 37);
	const copiedEntry = { taskId: 'task-a-2', description: 'Pairing on the invoices', isBillable: true };

	function renderCopyDialog(extra: Partial<React.ComponentProps<typeof AddManualTimeModal>> = {}) {
		return render(
			<AddManualTimeModal
				isOpen
				params="AddTime"
				closeModal={closeModal}
				initialStart={copiedStart}
				initialEnd={copiedEnd}
				prefill={copiedEntry}
				{...extra}
			/>
		);
	}

	beforeEach(() => {
		mockAddManualTime.mockReset();
		mockPickedTeamTasksQuery.data = undefined;
		mockAtomValues.activeTeamState = teamA;
		// The active task is another one than the copied entry's
		mockAtomValues.activeTeamTaskState = taskA;
		mockAtomValues.organizationTeamsState = [teamA, teamB];
		mockAtomValues.tasksByTeamState = teamATasks();
	});

	it("opens on the entry's task, notes, billable status and interval, and saves nothing until asked", () => {
		renderCopyDialog();

		expect(selectedValue('task')).toBe('task-a-2');
		expect(mockAddManualTime).not.toHaveBeenCalled();

		submitDialog();

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: 'task-a-2',
				description: 'Pairing on the invoices',
				isBillable: true,
				startedAt: copiedStart,
				stoppedAt: copiedEnd
			})
		);
	});

	it('leaves the task to pick, never the active one, when the list no longer offers the copied task', () => {
		renderCopyDialog({ prefill: { ...copiedEntry, taskId: 'task-gone' } });

		expect(selectedValue('task')).toBe('');

		submitDialog();

		expect(mockAddManualTime).not.toHaveBeenCalled();
		expect(screen.getByText('manualTime.FILL_IN manualTime.TASK')).toBeTruthy();
	});

	it('does not save a copy its opener refuses, and says why', async () => {
		const checkBeforeSave = jest.fn().mockResolvedValue('It runs over an entry of the day');
		renderCopyDialog({ checkBeforeSave });

		submitDialog();

		expect(await screen.findByText('It runs over an entry of the day')).toBeTruthy();
		expect(checkBeforeSave).toHaveBeenCalledWith(
			expect.objectContaining({ periods: [{ start: copiedStart, end: copiedEnd }] })
		);
		expect(mockAddManualTime).not.toHaveBeenCalled();
	});

	it('saves a copy its opener lets through', async () => {
		const checkBeforeSave = jest.fn().mockResolvedValue(null);
		renderCopyDialog({ checkBeforeSave });

		submitDialog();

		await waitFor(() => expect(mockAddManualTime).toHaveBeenCalledTimes(1));
		expect(mockAddManualTime).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task-a-2' }));
	});
});

describe('AddManualTimeModal team of the saved time', () => {
	beforeEach(() => {
		mockAddManualTime.mockReset();
		mockPickedTeamTasksQuery.data = undefined;
		mockAtomValues.activeTeamState = teamA;
		mockAtomValues.activeTeamTaskState = taskA;
		mockAtomValues.organizationTeamsState = [teamA, teamB];
		mockAtomValues.tasksByTeamState = teamATasks();
	});

	it('saves the time with the active team when no team is picked', () => {
		renderAddTimeDialog();

		submitDialog();

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId: 'org-1', organizationTeamId: 'team-a', taskId: 'task-a' })
		);
	});

	it('drops the task of the previous team when another team is picked', () => {
		renderAddTimeDialog();

		pickInSelect('teams', 'team-b');
		submitDialog();

		expect(mockAddManualTime).not.toHaveBeenCalled();
		expect(screen.getByText('manualTime.FILL_IN manualTime.TASK')).toBeTruthy();

		pickInSelect('task', 'task-shared');
		submitDialog();

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({ organizationTeamId: 'team-b', taskId: 'task-shared' })
		);
	});

	it("lists the picked team's own tasks, read for that team, and saves one with it", () => {
		const { rerender } = renderAddTimeDialog();

		pickInSelect('teams', 'team-b');
		expect(mockUseQuery).toHaveBeenLastCalledWith(
			expect.objectContaining({ queryKey: ['tasks', 'by-team', 'team-b'], enabled: true })
		);
		// The team-b list arrives
		mockPickedTeamTasksQuery.data = { items: teamBTasks() };
		rerender(<AddManualTimeModal isOpen params="AddTime" closeModal={closeModal} />);

		pickInSelect('task', 'task-b');
		submitDialog();

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({ organizationTeamId: 'team-b', taskId: 'task-b' })
		);
	});

	it('reads no other task list while the active team is the one picked', () => {
		renderAddTimeDialog();

		expect(mockUseQuery).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
	});

	it('keeps a task the picked team shares', () => {
		mockAtomValues.activeTeamTaskState = sharedTask;
		renderAddTimeDialog();

		pickInSelect('teams', 'team-b');
		submitDialog();

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({ organizationTeamId: 'team-b', taskId: 'task-shared' })
		);
	});

	it('does not bring the active task back when the task list refreshes after a team pick', () => {
		const { rerender } = renderAddTimeDialog();

		pickInSelect('teams', 'team-b');
		refreshTaskList(rerender);
		submitDialog();

		expect(mockAddManualTime).not.toHaveBeenCalled();
		expect(selectedValue('task')).toBe('');
	});

	it('keeps a picked task when the task list refreshes', () => {
		const { rerender } = renderAddTimeDialog();

		pickInSelect('task', 'task-a-2');
		refreshTaskList(rerender);
		submitDialog();

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({ organizationTeamId: 'team-a', taskId: 'task-a-2' })
		);
	});

	it('asks for a task again when the active team switches under the open dialog', () => {
		const { rerender } = renderAddTimeDialog();

		pickInSelect('task', 'task-a-2');
		switchActiveTeamToB(rerender);
		submitDialog();

		expect(selectedValue('teams')).toBe('team-b');
		expect(mockAddManualTime).not.toHaveBeenCalled();
		expect(screen.getByText('manualTime.FILL_IN manualTime.TASK')).toBeTruthy();

		pickInSelect('task', 'task-b');
		submitDialog();

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({ organizationTeamId: 'team-b', taskId: 'task-b' })
		);
	});

	it('saves the Calendar time with an employee of the active team', () => {
		renderCalendarDialog();

		clickButton('pick employee-a');
		submitDialog();

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({ organizationTeamId: 'team-a', taskId: 'task-a', employeeId: 'employee-a' })
		);
	});

	it('does not send an employee of the previous team after the active team switches', () => {
		const { rerender } = renderCalendarDialog();

		clickButton('pick employee-a');
		mockAtomValues.activeTeamState = teamB;
		mockAtomValues.activeTeamTaskState = null;
		mockAtomValues.tasksByTeamState = teamBTasks();
		rerender(calendarDialog());
		clickButton('pick task-b');
		submitDialog();

		expect(mockAddManualTime).not.toHaveBeenCalled();
		expect(screen.getByText('manualTime.FILL_IN manualTime.EMPLOYEE')).toBeTruthy();

		clickButton('pick employee-b');
		submitDialog();

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({ organizationTeamId: 'team-b', taskId: 'task-b', employeeId: 'employee-b' })
		);
	});
});

describe('AddManualTimeModal overlap with time already recorded', () => {
	beforeEach(() => {
		mockPickedTeamTasksQuery.data = undefined;
		mockAtomValues.activeTeamState = teamA;
		mockAtomValues.activeTeamTaskState = taskA;
		mockAtomValues.organizationTeamsState = [teamA, teamB];
		mockAtomValues.tasksByTeamState = teamATasks();
	});

	it('hands the save to the overlap check with the picked employee and the interval, and sends nothing itself', () => {
		mockSaveAfterCheck.mockImplementationOnce(() => undefined);
		renderCalendarDialog();

		clickButton('pick employee-a');
		submitDialog();

		expect(mockAddManualTime).not.toHaveBeenCalled();
		expect(mockSaveAfterCheck).toHaveBeenCalledTimes(1);
		const [request] = mockSaveAfterCheck.mock.calls[0];
		expect(request.employeeId).toBe('employee-a');
		expect(request.periods).toHaveLength(1);
		const [checkedPeriod] = request.periods;
		expect([checkedPeriod.start.getHours(), checkedPeriod.start.getMinutes()]).toEqual([9, 0]);
		expect([checkedPeriod.end.getHours(), checkedPeriod.end.getMinutes()]).toEqual([11, 0]);

		// The save the check held is the dialog's own, for the interval that was checked
		request.save();

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({
				employeeId: 'employee-a',
				startedAt: checkedPeriod.start,
				stoppedAt: checkedPeriod.end
			})
		);
	});

	it('does not ask the overlap check for a form that is not valid', () => {
		renderAddTimeDialog();

		pickInSelect('task', '');
		submitDialog();

		expect(mockSaveAfterCheck).not.toHaveBeenCalled();
		expect(mockAddManualTime).not.toHaveBeenCalled();
	});
});
