/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import type { BulkEditChoiceState } from '@/core/hooks/dashboards/timesheets/use-bulk-edit-choice';
import type { TOrganizationProject } from '@/core/types/schemas/organization/organization-project.schema';
import type { TTask } from '@/core/types/schemas/task/task.schema';

type MockToggleProps = { isActive: boolean; onClick: () => void; label: string };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	}
}));
jest.mock('@/core/components/features/tasks/edit-task-modal', () => ({
	ToggleButton: ({ isActive, onClick, label }: MockToggleProps) => (
		<button type="button" aria-pressed={isActive} onClick={onClick}>
			{label}
		</button>
	)
}));
jest.mock('@/core/components/features/timesheet/time-log-task-field', () => ({
	TaskLine: ({ task }: { task: { title: string } }) => <span>{task.title}</span>
}));
jest.mock('@/core/components/common/entity-tile', () => ({ EntityTile: () => null }));

import { TimesheetsBulkEditFields } from './timesheets-bulk-edit-fields';

const KEEP = 'dashboard.timesheets.BULK_EDIT.KEEP';

const site = { id: 'project-site', name: 'Site' } as TOrganizationProject;
const landingPage = { id: 'task-landing', title: 'Landing page', projectId: 'project-site' } as TTask;

function fieldsOf(overrides: {
	project?: Partial<BulkEditChoiceState['project']>;
	task?: Partial<BulkEditChoiceState['task']>;
	billable?: Partial<BulkEditChoiceState['billable']>;
}): BulkEditChoiceState {
	return {
		choice: { projectId: null, task: null, isBillable: null },
		listedTeamId: 'team',
		project: {
			pickedId: null,
			choices: [site],
			pick: jest.fn(),
			followsTask: false,
			followedProject: null,
			isLoading: false,
			hasFailed: false,
			retry: jest.fn(),
			...overrides.project
		},
		task: {
			pickedId: null,
			pickedTask: null,
			choices: [landingPage],
			pick: jest.fn(),
			narrowingProjectName: null,
			...overrides.task
		},
		billable: { value: null, pick: jest.fn(), ...overrides.billable }
	};
}

function pickerTexts() {
	const pickers = screen.getAllByRole('combobox');
	return pickers.map((picker) => picker.textContent);
}

describe('TimesheetsBulkEditFields', () => {
	it('rests on Keep as is in the project and the task pickers', () => {
		render(<TimesheetsBulkEditFields fields={fieldsOf({})} isDisabled={false} />);

		expect(pickerTexts()).toEqual([KEEP, KEEP]);
	});

	it('shows a picked project and a picked task in place of Keep as is', () => {
		const fields = fieldsOf({
			project: { pickedId: 'project-site' },
			task: { pickedId: 'task-landing', pickedTask: landingPage }
		});
		render(<TimesheetsBulkEditFields fields={fields} isDisabled={false} />);

		expect(pickerTexts()).toEqual(['Site', 'Landing page']);
	});

	it('says that the projects are loading, then that they could not load with a way to try again', () => {
		const { rerender } = render(
			<TimesheetsBulkEditFields fields={fieldsOf({ project: { isLoading: true } })} isDisabled={false} />
		);

		expect(screen.getByText('dashboard.timesheets.BULK_EDIT.PROJECTS_LOADING')).toBeTruthy();
		expect(pickerTexts()).toEqual([KEEP]);

		const retry = jest.fn();
		rerender(
			<TimesheetsBulkEditFields fields={fieldsOf({ project: { hasFailed: true, retry } })} isDisabled={false} />
		);
		screen.getByRole('button', { name: 'manualTime.DURATION.RETRY' }).click();

		expect(screen.getByRole('alert').textContent).toContain('dashboard.timesheets.BULK_EDIT.PROJECTS_FAILED');
		expect(retry).toHaveBeenCalledTimes(1);
	});

	it('marks the billable choice that is picked, and Keep as is while none is', () => {
		const { rerender } = render(<TimesheetsBulkEditFields fields={fieldsOf({})} isDisabled={false} />);
		const pressedOf = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');

		expect(pressedOf(KEEP)).toBe('true');
		expect(pressedOf('pages.timesheet.BILLABLE.YES')).toBe('false');

		rerender(<TimesheetsBulkEditFields fields={fieldsOf({ billable: { value: false } })} isDisabled={false} />);

		expect(pressedOf(KEEP)).toBe('false');
		expect(pressedOf('pages.timesheet.BILLABLE.NO')).toBe('true');
	});
});
