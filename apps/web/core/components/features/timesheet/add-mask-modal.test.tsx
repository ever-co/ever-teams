/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddTaskModal } from './add-mask-modal';

const mockCreateTimesheet = jest.fn();
const mockAtomValues: Record<string, unknown> = {};
const mockProjects: Array<{ id: string; billable?: boolean }> = [];
const mockProjectsQuery = { loading: false };

type MockCustomSelectProps = {
	ariaLabel?: string;
	options: Array<Record<string, unknown>>;
	value?: string;
	valueKey?: string;
	onChange?: (value: string) => void;
};

type MockChildrenProps = { children?: React.ReactNode };

type MockProject = { id: string };

type MockProjectPickerProps = {
	itemsLists: Record<string, MockProject[] | undefined>;
	selectedValues: Record<string, MockProject | null>;
	onSelectedValuesChange: (values: Record<string, MockProject | null>) => void;
};

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
	useOrganizationProjectsQuery: () => ({
		organizationProjects: mockProjects,
		getOrganizationProjectsLoading: mockProjectsQuery.loading
	})
}));

jest.mock('@/core/hooks/timesheet/use-create-timesheet', () => ({
	useCreateTimesheet: () => ({ createTimesheet: mockCreateTimesheet, loadingCreateTimesheet: false })
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
jest.mock('@/core/components/features/manual-time/time-overlap-confirm-dialog', () => ({
	TimeOverlapCheckError: () => null,
	TimeOverlapConfirmDialog: () => null
}));

jest.mock('@/core/lib/helpers/index', () => ({ toUTC: (date: Date) => date }));

jest.mock('@/core/lib/utils', () => ({ clsxm: () => '' }));

jest.mock('@/core/components', () => ({
	Modal: ({ children }: MockChildrenProps) => <>{children}</>
}));

jest.mock('@/core/components/teams/manage-member-component', () => ({
	getNestedValue: () => '',
	ManageOrMemberComponent: ({ itemsLists, selectedValues, onSelectedValuesChange }: MockProjectPickerProps) => {
		const offeredProjects = itemsLists.Project ?? [];
		const selectedProjectId = selectedValues.Project?.id ?? '';
		const pickProject = (projectId: string) => {
			const pickedProject = offeredProjects.find((project) => project.id === projectId) ?? null;
			onSelectedValuesChange({ Project: pickedProject });
		};
		return (
			<select
				aria-label="project"
				value={selectedProjectId}
				onChange={(event) => pickProject(event.target.value)}
			>
				<option value="">Select a project</option>
				{offeredProjects.map((project) => (
					<option key={project.id} value={project.id}>
						{project.id}
					</option>
				))}
			</select>
		);
	}
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

		// The cleared task and employee are required: nothing is saved until they are picked again
		expect(screen.getByRole('button', { name: 'common.SAVE' })).toHaveProperty('disabled', true);
		save();
		expect(mockCreateTimesheet).not.toHaveBeenCalled();

		pickTaskAndEmployee('task-b', 'employee-b');
		save();

		expect(mockCreateTimesheet).toHaveBeenCalledWith(
			expect.objectContaining({ organizationTeamId: 'team-b', taskId: 'task-b', employeeId: 'employee-b' })
		);
	});

	it('keeps Save disabled until both the task and the employee are picked', () => {
		renderAddTimeForm();
		fillShiftTimes();

		const saveButton = screen.getByRole('button', { name: 'common.SAVE' });
		expect(saveButton).toHaveProperty('disabled', true);

		const [taskSelect] = taskAndEmployeeSelects();
		fireEvent.change(taskSelect, { target: { value: 'task-a' } });
		expect(saveButton).toHaveProperty('disabled', true);

		pickTaskAndEmployee('task-a', 'employee-a');
		expect(saveButton).toHaveProperty('disabled', false);
	});
});

describe('AddTaskModal opened on a copied entry', () => {
	const copiedEntry = {
		taskId: 'task-a',
		projectId: '',
		employeeId: 'employee-a',
		isBillable: true,
		description: 'Pairing on the invoices',
		start: new Date(2026, 10, 12, 9, 0),
		end: new Date(2026, 10, 12, 11, 0)
	};

	beforeEach(() => {
		mockCreateTimesheet.mockReset();
		mockCreateTimesheet.mockResolvedValue(undefined);
		mockAtomValues.activeTeamState = teamA;
		mockAtomValues.tasksByTeamState = [taskA];
	});

	it('opens filled with the entry and saves what it shows only when asked', () => {
		render(<AddTaskModal isOpen closeModal={closeModal} prefill={copiedEntry} />);

		const [taskSelect, employeeSelect] = taskAndEmployeeSelects();
		const notes = screen.getByLabelText('Insert notes here') as HTMLTextAreaElement;
		expect(taskSelect.value).toBe('task-a');
		expect(employeeSelect.value).toBe('employee-a');
		expect(notes.value).toBe('Pairing on the invoices');
		expect(mockCreateTimesheet).not.toHaveBeenCalled();

		save();

		expect(mockCreateTimesheet).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: 'task-a',
				employeeId: 'employee-a',
				isBillable: true,
				description: 'Pairing on the invoices',
				startedAt: copiedEntry.start,
				stoppedAt: copiedEntry.end
			})
		);
	});

	it('leaves the task and the employee to pick when the dialog does not offer the copied ones', () => {
		const unlistedCopy = { ...copiedEntry, taskId: 'task-gone', employeeId: 'employee-gone' };
		render(<AddTaskModal isOpen closeModal={closeModal} prefill={unlistedCopy} />);

		const [taskSelect, employeeSelect] = taskAndEmployeeSelects();
		expect(taskSelect.value).toBe('');
		expect(employeeSelect.value).toBe('');
		expect(screen.getByRole('button', { name: 'common.SAVE' })).toHaveProperty('disabled', true);
	});

	it('does not save a copy its opener refuses, and says why', async () => {
		const checkBeforeSave = jest.fn().mockResolvedValue('It runs over an entry of the day');
		render(<AddTaskModal isOpen closeModal={closeModal} prefill={copiedEntry} checkBeforeSave={checkBeforeSave} />);

		save();

		const refusal = await screen.findByRole('alert');
		expect(refusal.textContent).toBe('It runs over an entry of the day');
		expect(checkBeforeSave).toHaveBeenCalledWith({
			employeeId: 'employee-a',
			periods: [{ start: copiedEntry.start, end: copiedEntry.end }]
		});
		expect(mockCreateTimesheet).not.toHaveBeenCalled();
	});

	it('saves a copy its opener lets through', async () => {
		const checkBeforeSave = jest.fn().mockResolvedValue(null);
		render(<AddTaskModal isOpen closeModal={closeModal} prefill={copiedEntry} checkBeforeSave={checkBeforeSave} />);

		save();

		await waitFor(() => expect(mockCreateTimesheet).toHaveBeenCalledTimes(1));
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('saves nothing when the dialog is closed while its copy is being checked', async () => {
		let answerCheck: (refusal: string | null) => void = () => undefined;
		const pendingCheck = new Promise<string | null>((resolve) => {
			answerCheck = resolve;
		});
		const checkBeforeSave = jest.fn().mockReturnValue(pendingCheck);
		const { unmount } = render(
			<AddTaskModal isOpen closeModal={closeModal} prefill={copiedEntry} checkBeforeSave={checkBeforeSave} />
		);

		save();
		await waitFor(() => expect(checkBeforeSave).toHaveBeenCalledTimes(1));
		unmount();
		await act(async () => {
			answerCheck(null);
		});

		expect(mockCreateTimesheet).not.toHaveBeenCalled();
	});
});

describe('AddTaskModal project of the saved time', () => {
	const siteProject = { id: 'project-site', billable: true };
	const mobileProject = { id: 'project-mobile', billable: false };
	const taskInSite = { id: 'task-site', title: 'Homepage mockup', projectId: 'project-site' };
	const taskWithoutProject = { id: 'task-loose', title: 'Loose task', projectId: null };

	const offeredProjectIds = () => {
		const projectSelect = screen.getByLabelText('project') as HTMLSelectElement;
		const options = Array.from(projectSelect.options);
		return options.map((option) => option.value);
	};

	beforeEach(() => {
		mockCreateTimesheet.mockReset();
		mockCreateTimesheet.mockResolvedValue(undefined);
		mockAtomValues.activeTeamState = teamA;
		mockAtomValues.tasksByTeamState = [taskInSite, taskWithoutProject];
		mockProjects.splice(0, mockProjects.length, siteProject, mobileProject);
		mockProjectsQuery.loading = false;
	});

	it("saves the time on the task's own project, billable as that project is, from Ever Teams", () => {
		renderAddTimeForm();

		pickTaskAndEmployee('task-site', 'employee-a');

		expect(offeredProjectIds()).toEqual(['', 'project-site']);

		fillShiftTimes();
		save();

		expect(mockCreateTimesheet).toHaveBeenCalledWith(
			expect.objectContaining({
				taskId: 'task-site',
				projectId: 'project-site',
				isBillable: true,
				source: 'TEAMS'
			})
		);
	});

	it('takes the billable setting of a project that loads after the task was picked', () => {
		mockProjects.splice(0, mockProjects.length);
		const { rerender } = renderAddTimeForm();

		pickTaskAndEmployee('task-site', 'employee-a');
		mockProjects.push(siteProject, mobileProject);
		rerender(<AddTaskModal isOpen closeModal={closeModal} />);
		fillShiftTimes();
		save();

		expect(mockCreateTimesheet).toHaveBeenCalledWith(
			expect.objectContaining({ taskId: 'task-site', projectId: 'project-site', isBillable: true })
		);
	});

	it("keeps Save off while the task's project is still loading", () => {
		mockProjects.splice(0, mockProjects.length);
		mockProjectsQuery.loading = true;
		const { rerender } = renderAddTimeForm();

		pickTaskAndEmployee('task-site', 'employee-a');
		const saveButton = screen.getByRole('button', { name: 'common.SAVE' }) as HTMLButtonElement;

		expect(saveButton.disabled).toBe(true);

		mockProjects.push(siteProject, mobileProject);
		mockProjectsQuery.loading = false;
		rerender(<AddTaskModal isOpen closeModal={closeModal} />);

		expect(saveButton.disabled).toBe(false);
	});

	it("saves the task's current project when it changed while the form was open", () => {
		const { rerender } = renderAddTimeForm();

		pickTaskAndEmployee('task-site', 'employee-a');
		const movedTask = { ...taskInSite, projectId: 'project-mobile' };
		mockAtomValues.tasksByTeamState = [movedTask, taskWithoutProject];
		rerender(<AddTaskModal isOpen closeModal={closeModal} />);
		fillShiftTimes();
		save();

		expect(mockCreateTimesheet).toHaveBeenCalledWith(
			expect.objectContaining({ taskId: 'task-site', projectId: 'project-mobile', isBillable: false })
		);
	});

	it('keeps the project shown when moving on to a task without one after the first task moved', () => {
		const { rerender } = renderAddTimeForm();

		pickTaskAndEmployee('task-site', 'employee-a');
		const movedTask = { ...taskInSite, projectId: 'project-mobile' };
		mockAtomValues.tasksByTeamState = [movedTask, taskWithoutProject];
		rerender(<AddTaskModal isOpen closeModal={closeModal} />);
		pickTaskAndEmployee('task-loose', 'employee-a');
		fillShiftTimes();
		save();

		expect(mockCreateTimesheet).toHaveBeenCalledWith(
			expect.objectContaining({ taskId: 'task-loose', projectId: 'project-mobile' })
		);
	});

	it('keeps the project picked by hand for a task without one', () => {
		renderAddTimeForm();

		fireEvent.change(screen.getByLabelText('project'), { target: { value: 'project-mobile' } });
		pickTaskAndEmployee('task-loose', 'employee-a');
		fillShiftTimes();
		save();

		expect(mockCreateTimesheet).toHaveBeenCalledWith(
			expect.objectContaining({ taskId: 'task-loose', projectId: 'project-mobile', isBillable: false })
		);
	});

	it("offers no other project for a task whose project is not in the list, and saves the task's own", () => {
		const taskInArchivedProject = { id: 'task-archived', title: 'Old task', projectId: 'project-archived' };
		mockAtomValues.tasksByTeamState = [taskInArchivedProject, taskWithoutProject];
		renderAddTimeForm();

		pickTaskAndEmployee('task-archived', 'employee-a');

		expect(offeredProjectIds()).toEqual(['']);

		fillShiftTimes();
		save();

		expect(mockCreateTimesheet).toHaveBeenCalledWith(
			expect.objectContaining({ taskId: 'task-archived', projectId: 'project-archived' })
		);
	});
});

describe('AddTaskModal overlap with time already recorded', () => {
	beforeEach(() => {
		mockCreateTimesheet.mockReset();
		mockCreateTimesheet.mockResolvedValue(undefined);
		mockAtomValues.activeTeamState = teamA;
		mockAtomValues.tasksByTeamState = [taskA];
	});

	it('hands the save to the overlap check with the employee and the period, and sends nothing itself', () => {
		mockSaveAfterCheck.mockImplementationOnce(() => undefined);
		renderAddTimeForm();

		pickTaskAndEmployee('task-a', 'employee-a');
		fillShiftTimes();
		save();

		expect(mockCreateTimesheet).not.toHaveBeenCalled();
		expect(mockSaveAfterCheck).toHaveBeenCalledTimes(1);
		const [request] = mockSaveAfterCheck.mock.calls[0];
		expect(request.employeeId).toBe('employee-a');
		expect(request.periods).toHaveLength(1);
		const [checkedPeriod] = request.periods;
		expect(checkedPeriod.start.getHours()).toBe(9);
		expect(checkedPeriod.end.getHours()).toBe(11);

		// The save the check held sends the period that was checked
		void request.save();

		expect(mockCreateTimesheet).toHaveBeenCalledWith(
			expect.objectContaining({ startedAt: checkedPeriod.start, stoppedAt: checkedPeriod.end })
		);
	});

	it('says that two periods overlap each other, and checks or sends nothing', () => {
		renderAddTimeForm();

		pickTaskAndEmployee('task-a', 'employee-a');
		fireEvent.click(screen.getByText('common.ADD_ANOTHER_PERIOD'));
		// Both periods 09:00 to 11:00 on the same day: the later one would make the API remove the earlier one
		const times = screen.getAllByLabelText('shift time');
		for (const [index, select] of times.entries()) {
			fireEvent.change(select, { target: { value: index % 2 === 0 ? '09:00 AM' : '11:00 AM' } });
		}
		save();

		expect(screen.getByRole('alert').textContent).toBe('timeOverlap.PERIODS_OVERLAP');
		expect(mockSaveAfterCheck).not.toHaveBeenCalled();
		expect(mockCreateTimesheet).not.toHaveBeenCalled();
	});
});
