/** @jest-environment jsdom */

import React from 'react';
import { Provider, createStore } from 'jotai';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { organizationTeamsState } from '@/core/stores/teams/organization-team';
import { teamTasksState } from '@/core/stores/teams/team-tasks';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganizationTeam } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import { EditTaskModal } from './edit-task-modal';

const mockUpdateTimeLog = jest.fn();
const mockProjects: Array<{ id: string; name: string }> = [];

type MockChildrenProps = { children?: React.ReactNode };

type MockProject = { id: string };

type MockProjectPickerProps = {
	itemsLists: Record<string, MockProject[] | undefined>;
	selectedValues: Record<string, MockProject | null>;
	onSelectedValuesChange: (values: Record<string, MockProject | null>) => void;
};

type MockCustomSelectProps = {
	ariaLabel?: string;
	options: Array<Record<string, unknown> | string>;
	value?: string;
	valueKey?: string;
	onChange?: (value: string) => void;
};

// The dialog reads the active team from the stores barrel, the task field from the atom's own module: one atom
jest.mock('@/core/stores', () => ({
	activeTeamState: jest.requireActual('@/core/stores/teams/organization-team').activeTeamState
}));

// The keys stand for the texts; the values a sentence takes are appended so each message stays distinct
function translate(key: string, values?: Record<string, string>) {
	if (!values) {
		return key;
	}
	const parts = Object.values(values);
	return `${key} ${parts.join(' ')}`;
}

jest.mock('next-intl', () => ({ useTranslations: () => translate }));

jest.mock('@/core/hooks', () => ({ useMyRolePermissionsQuery: () => ({ myPermissions: [] }) }));

type MockOverlapRequest = { save: () => void | Promise<void> };

// The overlap lookup finds nothing here, so every save goes through at once: the guard has its own tests
const mockSaveAfterCheck = jest.fn((request: MockOverlapRequest) => request.save());

jest.mock('@/core/hooks/timesheet', () => ({
	useUpdateTimeLogMutation: () => ({ mutateAsync: mockUpdateTimeLog, isPending: false }),
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

jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({ organizationProjects: mockProjects })
}));

jest.mock('@/core/lib/helpers/index', () => ({
	differenceBetweenHours: () => 5400,
	formatTimeFromDate: (date: Date) => new Date(date).toTimeString().slice(0, 5),
	secondsToTime: () => ({ hours: 1, minutes: 30 }),
	toDate: (date: Date) => new Date(date)
}));

jest.mock('sonner', () => ({ toast: { success: jest.fn() } }));

jest.mock('@/core/components', () => ({
	Modal: ({ children }: MockChildrenProps) => <>{children}</>
}));

jest.mock('../../timesheet/timesheet-action', () => ({ statusTable: [] }));
jest.mock('../../pages/timesheet/timesheet-filter-date', () => ({ DatePickerFilter: () => null }));
jest.mock('@/core/components/tasks/task-displays', () => ({ TaskNameInfoDisplay: () => null }));

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

// A native select stands in for the dialog's selects (the task, the member, the status)
jest.mock('../../common/multiple-select', () => ({
	CustomSelect: ({ ariaLabel, options, value, valueKey = 'id', onChange }: MockCustomSelectProps) => (
		<select aria-label={ariaLabel} value={value ?? ''} onChange={(event) => onChange?.(event.target.value)}>
			<option value="">Select an option</option>
			{options.map((option) => {
				const optionValue = typeof option === 'string' ? option : String(option[valueKey]);
				return (
					<option key={optionValue} value={optionValue}>
						{optionValue}
					</option>
				);
			})}
		</select>
	)
}));

const siteProject = { id: 'project-site', name: 'Website' };
const mobileProject = { id: 'project-mobile', name: 'Mobile app' };

const taskInSite = { id: 'task-site', title: 'Homepage', projectId: 'project-site' } as TTask;
const taskInMobile = { id: 'task-mobile', title: 'Login screen', projectId: 'project-mobile' } as TTask;
const taskWithoutProject = { id: 'task-loose', title: 'Loose task', projectId: null } as TTask;

const teamA = { id: 'team-a', members: [] } as unknown as TOrganizationTeam;

function logOf(overrides: Partial<ITimeLog>): ITimeLog {
	return {
		id: 'log-1',
		duration: 5400,
		version: '1',
		employeeId: 'employee-a',
		organizationTeamId: 'team-a',
		task: taskInSite,
		taskId: 'task-site',
		project: siteProject,
		projectId: 'project-site',
		description: 'Design review',
		isBillable: true,
		startedAt: new Date(2026, 10, 10, 9, 0),
		stoppedAt: new Date(2026, 10, 10, 10, 30),
		...overrides
	} as ITimeLog;
}

function renderEditDialog(log: ITimeLog, teamTasks: TTask[] = [taskInSite, taskInMobile, taskWithoutProject]) {
	const store = createStore();
	// The active team is the first of the organization's teams
	store.set(organizationTeamsState, [teamA]);
	store.set(teamTasksState, teamTasks);
	const dialogOf = (isOpen: boolean, entry: ITimeLog) => (
		<Provider store={store}>
			<EditTaskModal isOpen={isOpen} closeModal={jest.fn()} timeLogData={entry} />
		</Provider>
	);
	const view = render(dialogOf(true, log));
	// The page keeps the dialog mounted once closed, and opens it again on the entry as it then holds it
	const reopen = (entry: ITimeLog = log) => {
		view.rerender(dialogOf(false, log));
		view.rerender(dialogOf(true, entry));
	};
	return { ...view, reopen };
}

function taskSelect() {
	return screen.getByLabelText('manualTime.TASK') as HTMLSelectElement;
}

function pickTask(taskId: string) {
	fireEvent.change(taskSelect(), { target: { value: taskId } });
}

function offeredProjectIds() {
	const projectSelect = screen.getByLabelText('project') as HTMLSelectElement;
	return Array.from(projectSelect.options).map((option) => option.value);
}

async function saveEntry() {
	const saveButton = screen.getByRole('button', { name: 'common.SAVE' });
	await act(async () => {
		fireEvent.click(saveButton);
	});
	const [payload] = mockUpdateTimeLog.mock.calls[0];
	return payload as Record<string, unknown>;
}

describe('EditTaskModal task of the entry', () => {
	beforeEach(() => {
		mockUpdateTimeLog.mockReset();
		mockUpdateTimeLog.mockResolvedValue({});
		mockProjects.splice(0, mockProjects.length, siteProject, mobileProject);
	});

	it('saves the entry as before while its task is left as it is', async () => {
		renderEditDialog(logOf({}));

		expect(taskSelect().value).toBe('task-site');
		expect(offeredProjectIds()).toEqual(['', 'project-site', 'project-mobile']);

		const payload = await saveEntry();

		expect(payload).toMatchObject({ timeLogId: 'log-1', projectId: 'project-site', employeeId: 'employee-a' });
		expect(payload).not.toHaveProperty('taskId');
	});

	it("moves the entry to the picked task and to that task's project", async () => {
		renderEditDialog(logOf({}));

		pickTask('task-mobile');

		expect(screen.getByText('manualTime.TASK_CHANGE.PROJECT_FOLLOWS Mobile app')).toBeTruthy();
		expect(offeredProjectIds()).toEqual(['', 'project-mobile']);

		const payload = await saveEntry();

		expect(payload).toMatchObject({ timeLogId: 'log-1', taskId: 'task-mobile', projectId: 'project-mobile' });
	});

	it("keeps the entry's project when the new task has none", async () => {
		renderEditDialog(logOf({}));

		pickTask('task-loose');

		expect(offeredProjectIds()).toEqual(['', 'project-site', 'project-mobile']);

		const payload = await saveEntry();

		expect(payload).toMatchObject({ taskId: 'task-loose', projectId: 'project-site' });
	});

	it('sends no project when neither the entry nor its new task has one', async () => {
		renderEditDialog(logOf({ project: undefined, projectId: undefined }));

		pickTask('task-loose');
		const payload = await saveEntry();

		expect(payload.taskId).toBe('task-loose');
		expect(payload.projectId).toBeUndefined();
	});

	it('sends nothing about the task when the first one is picked again', async () => {
		renderEditDialog(logOf({}));

		pickTask('task-mobile');
		pickTask('task-site');
		const payload = await saveEntry();

		expect(payload).not.toHaveProperty('taskId');
		expect(payload.projectId).toBe('project-site');
	});

	it('drops a task picked in an opening that was closed without saving', async () => {
		const view = renderEditDialog(logOf({}));

		pickTask('task-mobile');
		view.reopen();

		expect(taskSelect().value).toBe('task-site');

		const payload = await saveEntry();

		expect(payload).not.toHaveProperty('taskId');
		expect(payload.projectId).toBe('project-site');
	});

	it("shows the entry's own task when the team's list does not hold it", () => {
		renderEditDialog(logOf({}), [taskInMobile]);

		expect(taskSelect().value).toBe('task-site');
	});

	it('keeps the task of an entry filed under another team, and says why', () => {
		renderEditDialog(logOf({ organizationTeamId: 'team-b' }));

		expect(screen.queryByLabelText('manualTime.TASK')).toBeNull();
		expect(screen.getByText('manualTime.TASK_CHANGE.OTHER_TEAM')).toBeTruthy();
	});
});
