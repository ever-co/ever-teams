/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AddManualTimeModal } from './add-manual-time-modal';

const mockAddManualTime = jest.fn();
const mockAtomValues: Record<string, unknown> = {};

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

jest.mock('@/core/lib/helpers', () => ({
	cn: (...classes: unknown[]) => classes.filter(Boolean).join(' ')
}));

jest.mock('@/core/lib/utils', () => ({
	clsxm: (...classes: unknown[]) => classes.filter(Boolean).join(' ')
}));

jest.mock('@/core/components', () => ({
	Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => {
		const buttonProps = { ...props };
		delete buttonProps.loading;
		return <button {...buttonProps} />;
	},
	Modal: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

jest.mock('@/core/components/common/date-picker', () => ({ DatePicker: () => null }));

jest.mock('../../teams/manage-member-component', () => ({
	getNestedValue: () => '',
	ManageOrMemberComponent: () => null
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
			{options.map((option) => (
				<option key={String(option[valueKey])} value={String(option[valueKey])}>
					{String(option[valueKey])}
				</option>
			))}
		</select>
	)
}));

const teamA = { id: 'team-a', name: 'Team A', organizationId: 'org-1', projects: [], members: [] };
const teamB = { id: 'team-b', name: 'Team B', organizationId: 'org-1', projects: [], members: [] };
const taskA = { id: 'task-a', title: 'Task A', teams: [{ id: 'team-a' }], members: [] };
const otherTaskA = { id: 'task-a-2', title: 'Task A 2', teams: [{ id: 'team-a' }], members: [] };
const taskB = { id: 'task-b', title: 'Task B', teams: [{ id: 'team-b' }], members: [] };

const closeModal = jest.fn();

function renderAddTimeDialog() {
	const view = render(<AddManualTimeModal isOpen params="AddTime" closeModal={closeModal} />);
	const [startInput, endInput] = Array.from(view.container.querySelectorAll('input[type="time"]'));
	fireEvent.change(startInput, { target: { value: '09:00' } });
	fireEvent.change(endInput, { target: { value: '11:00' } });
	return view;
}

// A task list refetch hands the dialog a new array, which re-runs its initialization effect
function refreshTaskList(rerender: ReturnType<typeof render>['rerender']) {
	mockAtomValues.tasksByTeamState = [taskA, otherTaskA, taskB];
	rerender(<AddManualTimeModal isOpen params="AddTime" closeModal={closeModal} />);
}

function pickInSelect(ariaLabel: string, value: string) {
	fireEvent.change(screen.getByLabelText(ariaLabel), { target: { value } });
}

function submitDialog() {
	fireEvent.click(screen.getByRole('button', { name: 'common.ADD_TIME' }));
}

describe('AddManualTimeModal team of the saved time', () => {
	beforeEach(() => {
		mockAddManualTime.mockReset();
		mockAtomValues.activeTeamState = teamA;
		mockAtomValues.activeTeamTaskState = taskA;
		mockAtomValues.organizationTeamsState = [teamA, teamB];
		mockAtomValues.tasksByTeamState = [taskA, otherTaskA, taskB];
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

		pickInSelect('task', 'task-b');
		submitDialog();

		expect(mockAddManualTime).toHaveBeenCalledWith(
			expect.objectContaining({ organizationTeamId: 'team-b', taskId: 'task-b' })
		);
	});

	it('does not bring the active task back when the task list refreshes after a team pick', () => {
		const { rerender } = renderAddTimeDialog();

		pickInSelect('teams', 'team-b');
		refreshTaskList(rerender);
		submitDialog();

		expect(mockAddManualTime).not.toHaveBeenCalled();
		expect((screen.getByLabelText('task') as HTMLSelectElement).value).toBe('');
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
});
