/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-1' } })
}));

jest.mock('@/core/hooks/organizations/teams/use-team-member', () => ({
	useIsMemberManager: () => ({ isTeamManager: true })
}));

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
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

describe('AddManualTimeModal team of the saved time', () => {
	beforeEach(() => {
		mockAddManualTime.mockReset();
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
		expect(screen.getByText('Please complete: Task')).toBeTruthy();

		pickInSelect('task', 'task-shared');
		submitDialog();

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({ organizationTeamId: 'team-b', taskId: 'task-shared' })
		);
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
		expect(screen.getByText('Please complete: Task')).toBeTruthy();

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
		expect(screen.getByText('Please complete: Employee')).toBeTruthy();

		clickButton('pick employee-b');
		submitDialog();

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({ organizationTeamId: 'team-b', taskId: 'task-b', employeeId: 'employee-b' })
		);
	});
});
