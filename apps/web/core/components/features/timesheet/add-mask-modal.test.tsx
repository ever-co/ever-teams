/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AddTaskModal } from './add-mask-modal';

const mockCreateTimesheet = jest.fn();
const mockAtomValues: Record<string, unknown> = {};

type MockCustomSelectProps = {
	ariaLabel?: string;
	options: Array<Record<string, unknown>>;
	value?: string;
	valueKey?: string;
	onChange?: (value: string) => void;
};

type MockChildrenProps = { children?: React.ReactNode };

jest.mock('jotai', () => ({
	useAtomValue: (atom: string) => mockAtomValues[atom]
}));

jest.mock('@/core/stores', () => ({
	activeTeamState: 'activeTeamState',
	tasksByTeamState: 'tasksByTeamState'
}));

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

jest.mock('@/core/hooks', () => ({
	useTimelogFilterOptions: () => ({ generateTimeOptions: () => ['09:00 AM', '11:00 AM'] })
}));

jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({ organizationProjects: [] })
}));

jest.mock('@/core/hooks/timesheet/use-create-timesheet', () => ({
	useCreateTimesheet: () => ({ createTimesheet: mockCreateTimesheet, loadingCreateTimesheet: false })
}));

jest.mock('@/core/lib/helpers/index', () => ({ toUTC: (date: Date) => date }));

jest.mock('@/core/lib/utils', () => ({ clsxm: () => '' }));

jest.mock('@/core/components', () => ({
	Modal: ({ children }: MockChildrenProps) => <>{children}</>
}));

jest.mock('@/core/components/teams/manage-member-component', () => ({
	getNestedValue: () => '',
	ManageOrMemberComponent: () => null
}));

jest.mock('@/core/components/common/accordion', () => ({
	Accordion: ({ children }: MockChildrenProps) => <div>{children}</div>,
	AccordionContent: ({ children }: MockChildrenProps) => <div>{children}</div>,
	AccordionItem: ({ children }: MockChildrenProps) => <div>{children}</div>,
	AccordionTrigger: ({ children }: MockChildrenProps) => <div>{children}</div>
}));

// The shift times use the Radix select: a native one stands in, its items become options
jest.mock('@/core/components/common/select', () => ({
	Select: ({
		value,
		onValueChange,
		children
	}: MockChildrenProps & { value?: string; onValueChange: (v: string) => void }) => (
		<select aria-label="shift time" value={value} onChange={(event) => onValueChange(event.target.value)}>
			{children}
		</select>
	),
	SelectContent: ({ children }: MockChildrenProps) => <>{children}</>,
	SelectGroup: ({ children }: MockChildrenProps) => <>{children}</>,
	SelectItem: ({ value, children }: MockChildrenProps & { value: string }) => (
		<option value={value}>{children}</option>
	),
	SelectTrigger: () => null,
	SelectValue: () => null
}));

// The task and the employee use CustomSelect, controlled by the form state
jest.mock('../../common/multiple-select', () => ({
	CustomSelect: ({ ariaLabel, options, value, valueKey = 'id', onChange }: MockCustomSelectProps) => (
		<select aria-label={ariaLabel} value={value} onChange={(event) => onChange?.(event.target.value)}>
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

jest.mock('@radix-ui/react-icons', () => ({ PlusIcon: () => null, ReloadIcon: () => null }));
jest.mock('../../tasks/task-displays', () => ({ TaskNameInfoDisplay: () => null }));
jest.mock('../tasks/edit-task-modal', () => ({ ToggleButton: () => null }));
jest.mock('../../pages/timesheet/timesheet-filter-date', () => ({ DatePickerFilter: () => null }));

function teamWithMember(teamId: string, employeeId: string) {
	const employee = { fullName: employeeId, user: { imageUrl: '' } };
	return { id: teamId, organizationId: 'org-1', members: [{ employeeId, employee }] };
}

const teamA = teamWithMember('team-a', 'employee-a');
const teamB = teamWithMember('team-b', 'employee-b');
const taskA = { id: 'task-a', title: 'Task A' };
const taskB = { id: 'task-b', title: 'Task B' };

const closeModal = jest.fn();

function renderAddTimeForm() {
	return render(<AddTaskModal isOpen closeModal={closeModal} />);
}

// Both CustomSelects carry the same aria-label: the task one comes first, then the employee one
function taskAndEmployeeSelects() {
	return screen.getAllByLabelText('Task issues') as HTMLSelectElement[];
}

function pickTaskAndEmployee(taskId: string, employeeId: string) {
	const [taskSelect, employeeSelect] = taskAndEmployeeSelects();
	fireEvent.change(taskSelect, { target: { value: taskId } });
	fireEvent.change(employeeSelect, { target: { value: employeeId } });
}

function fillShiftTimes() {
	const [startSelect, endSelect] = screen.getAllByLabelText('shift time');
	fireEvent.change(startSelect, { target: { value: '09:00 AM' } });
	fireEvent.change(endSelect, { target: { value: '11:00 AM' } });
}

function save() {
	const saveButton = screen.getByRole('button', { name: 'common.SAVE' });
	fireEvent.click(saveButton);
}

describe('AddTaskModal team of the saved time', () => {
	beforeEach(() => {
		mockCreateTimesheet.mockReset();
		mockCreateTimesheet.mockResolvedValue(undefined);
		mockAtomValues.activeTeamState = teamA;
		mockAtomValues.tasksByTeamState = [taskA];
	});

	it('saves the time with the active team', () => {
		renderAddTimeForm();

		pickTaskAndEmployee('task-a', 'employee-a');
		fillShiftTimes();
		save();

		expect(mockCreateTimesheet).toHaveBeenCalledWith(
			expect.objectContaining({ organizationTeamId: 'team-a', taskId: 'task-a', employeeId: 'employee-a' })
		);
	});

	it('clears the task and the employee of the previous team when the active team switches', () => {
		const { rerender } = renderAddTimeForm();

		pickTaskAndEmployee('task-a', 'employee-a');
		fillShiftTimes();
		// Another tab switched the active team and this tab's team list refetched while the form is open
		mockAtomValues.activeTeamState = teamB;
		mockAtomValues.tasksByTeamState = [taskB];
		rerender(<AddTaskModal isOpen closeModal={closeModal} />);

		const [taskSelect, employeeSelect] = taskAndEmployeeSelects();
		expect(taskSelect.value).toBe('');
		expect(employeeSelect.value).toBe('');

		save();

		expect(mockCreateTimesheet).toHaveBeenCalledWith(
			expect.objectContaining({ organizationTeamId: 'team-b', taskId: '', employeeId: '' })
		);
	});
});
