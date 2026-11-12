/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import type { BulkEditResult } from '@/core/lib/utils/dashboards/timesheet-bulk-edit';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const mockGetTimeLogConflicts = jest.fn();
const mockUpdateTimeLog = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastWarning = jest.fn();
const mockAtomValues: Record<string, unknown> = {};
const mockProjects = [
	{ id: 'project-site', name: 'Site' },
	{ id: 'project-mobile', name: 'Mobile' }
];

type MockSelectProps = {
	ariaLabel?: string;
	value?: string;
	options: Array<{ id: string }>;
	onChange?: (value: string) => void;
};

type MockModalProps = { title?: string; description?: string; showCloseIcon?: boolean; children?: ReactNode };

jest.mock('jotai', () => ({ useAtomValue: (atom: string) => mockAtomValues[atom] }));
jest.mock('@/core/stores/teams/organization-team', () => ({ activeTeamState: 'activeTeamState' }));
jest.mock('@/core/stores/teams/team-tasks', () => ({ tasksByTeamState: 'tasksByTeamState' }));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	}
}));
jest.mock('sonner', () => ({
	toast: {
		success: (message: string) => mockToastSuccess(message),
		warning: (message: string) => mockToastWarning(message),
		error: jest.fn()
	}
}));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({
		organizationProjects: mockProjects,
		getOrganizationProjectsLoading: false,
		isOrganizationProjectsError: false,
		refetchOrganizationProjects: jest.fn()
	})
}));
jest.mock('@/core/services/client/api/timesheets/time-log.service', () => ({
	timeLogService: {
		getTimeLogConflicts: (params: unknown) => mockGetTimeLogConflicts(params),
		updateTimeLog: (payload: unknown) => mockUpdateTimeLog(payload)
	}
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getOrganizationIdCookie: () => 'organization-a',
	getTenantIdCookie: () => 'tenant-a'
}));
jest.mock('@/core/lib/helpers/error-message', () => ({ logErrorInDev: jest.fn() }));
// The page hook drags the whole page's data layer in; only its edit rule is needed here
jest.mock('@/core/hooks/dashboards/timesheets/use-timesheets-page', () => ({
	canEditLog: (log: ITimeLog, permissions: TimesheetPermissions) => {
		if (permissions.hasOrganizationRole) {
			return true;
		}
		return log.employeeId === permissions.employeeId;
	}
}));

// The dialog's primitives are replaced by plain elements: what is checked here is what the dialog asks of them
jest.mock('@/core/components/common/modal', () => ({
	Modal: ({ title, description, showCloseIcon, children }: MockModalProps) => (
		<div role="dialog" aria-label={title} data-closable={String(showCloseIcon)}>
			{description && <p>{description}</p>}
			{children}
		</div>
	),
	modalFooterClass: '',
	modalPrimaryActionClass: '',
	modalSecondaryActionClass: '',
	modalFieldLabelClass: ''
}));
jest.mock('@/core/components/common/multiple-select', () => ({
	CustomSelect: ({ ariaLabel, value, options, onChange }: MockSelectProps) => (
		<select aria-label={ariaLabel} value={value} onChange={(event) => onChange?.(event.target.value)}>
			{options.map((option) => (
				<option key={option.id} value={option.id}>
					{option.id}
				</option>
			))}
		</select>
	)
}));
jest.mock('@/core/components/features/timesheet/time-log-task-field', () => ({ TaskLine: () => null }));
jest.mock('@/core/components/common/entity-tile', () => ({ EntityTile: () => null }));
jest.mock('@/core/components/common/toast-orb', () => ({ ToastOrb: () => null }));
jest.mock('@/core/components/icons', () => ({ Minus: () => null, Spinner: () => null }));

import { TimesheetsBulkEditDialog } from './timesheets-bulk-edit-dialog';

const KEEP = 'dashboard.timesheets.BULK_EDIT.KEEP';
const PROJECT = 'dashboard.timesheets.COLUMNS.PROJECT';
const TASK = 'dashboard.timesheets.COLUMNS.TASK';
const BILLABLE = 'dashboard.timesheets.BILLABLE';
const YES = 'pages.timesheet.BILLABLE.YES';

const startedAt = new Date('2026-11-10T09:00:00.000Z');
const stoppedAt = new Date('2026-11-10T10:00:00.000Z');

const admin: TimesheetPermissions = {
	hasOrganizationRole: true,
	isManage: true,
	canApprove: true,
	userId: 'user-admin',
	employeeId: 'admin'
};

function logOf(id: string, overrides: Partial<ITimeLog> = {}): ITimeLog {
	return {
		id,
		duration: 3600,
		version: '1',
		employeeId: 'member',
		organizationTeamId: 'team',
		taskId: 'task-site',
		projectId: 'project-site',
		isBillable: false,
		startedAt,
		stoppedAt,
		...overrides
	};
}

function renderDialog(logs: ITimeLog[]) {
	const closeModal = jest.fn();
	const onFinished = jest.fn<void, [BulkEditResult]>();
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	render(
		<QueryClientProvider client={client}>
			<TimesheetsBulkEditDialog
				isOpen
				closeModal={closeModal}
				logs={logs}
				permissions={admin}
				onFinished={onFinished}
			/>
		</QueryClientProvider>
	);
	return { closeModal, onFinished };
}

function updateButton() {
	return screen.getByRole<HTMLButtonElement>('button', { name: /BULK_EDIT\.UPDATE / });
}

/** A save the test answers when it chooses. */
function pendingSave() {
	let settle: () => void = () => undefined;
	const promise = new Promise<void>((resolve) => {
		settle = resolve;
	});
	return { promise, settle: () => settle() };
}

describe('TimesheetsBulkEditDialog', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAtomValues.activeTeamState = { id: 'team' };
		mockAtomValues.tasksByTeamState = [
			{ id: 'task-site', projectId: 'project-site' },
			{ id: 'task-mobile', projectId: 'project-mobile' }
		];
		mockGetTimeLogConflicts.mockResolvedValue([]);
		mockUpdateTimeLog.mockResolvedValue({});
	});

	it('opens with every field on Keep as is and nothing to update', () => {
		renderDialog([logOf('a'), logOf('b'), logOf('c')]);

		expect(screen.getByRole('dialog', { name: 'dashboard.timesheets.BULK_EDIT.TITLE {"count":3}' })).toBeTruthy();
		expect(screen.getByRole<HTMLSelectElement>('combobox', { name: PROJECT }).value).toBe('keep-as-is');
		expect(screen.getByRole<HTMLSelectElement>('combobox', { name: TASK }).value).toBe('keep-as-is');
		expect(screen.getByRole('tab', { name: KEEP }).getAttribute('aria-selected')).toBe('true');
		expect(screen.getByText('dashboard.timesheets.BULK_EDIT.NOTHING_CHOSEN')).toBeTruthy();
		expect(updateButton().disabled).toBe(true);
	});

	it('names each field as a group, so a picker is found by its label', () => {
		renderDialog([logOf('a')]);

		expect(screen.getByRole('group', { name: PROJECT })).toBeTruthy();
		expect(screen.getByRole('group', { name: TASK })).toBeTruthy();
		expect(screen.getByRole('group', { name: BILLABLE })).toBeTruthy();
	});

	it('says how many entries it will update and how many already have the value', () => {
		renderDialog([logOf('a'), logOf('b'), logOf('already', { isBillable: true })]);

		fireEvent.click(screen.getByRole('tab', { name: YES }));

		expect(screen.getByText('dashboard.timesheets.BULK_EDIT.WILL_UPDATE {"count":2}')).toBeTruthy();
		expect(screen.getByText('dashboard.timesheets.BULK_EDIT.REASON.UNCHANGED {"count":1}')).toBeTruthy();
		expect(updateButton().textContent).toBe('dashboard.timesheets.BULK_EDIT.UPDATE {"count":2}');
		expect(updateButton().disabled).toBe(false);
	});

	it('goes back to Keep as is when the resting toggle is pressed again', () => {
		renderDialog([logOf('a')]);

		fireEvent.click(screen.getByRole('tab', { name: YES }));
		fireEvent.click(screen.getByRole('tab', { name: KEEP }));

		expect(screen.getByText('dashboard.timesheets.BULK_EDIT.NOTHING_CHOSEN')).toBeTruthy();
		expect(updateButton().disabled).toBe(true);
	});

	it("shows the task's project in place of the project picker once such a task is picked", () => {
		renderDialog([logOf('a')]);

		fireEvent.change(screen.getByRole('combobox', { name: TASK }), { target: { value: 'task-mobile' } });

		expect(screen.queryByRole('combobox', { name: PROJECT })).toBeNull();
		expect(screen.getByText('dashboard.timesheets.BULK_EDIT.PROJECT_FOLLOWS {"project":"Mobile"}')).toBeTruthy();
	});

	it('narrows the tasks to the project picked by hand', () => {
		renderDialog([logOf('a')]);

		fireEvent.change(screen.getByRole('combobox', { name: PROJECT }), { target: { value: 'project-mobile' } });

		const taskOptions = screen.getByRole<HTMLSelectElement>('combobox', { name: TASK }).options;
		const offeredValues = Array.from(taskOptions).map((option) => option.value);
		expect(offeredValues).toEqual(['keep-as-is', 'task-mobile']);
		expect(screen.getByText('dashboard.timesheets.BULK_EDIT.TASKS_OF_PROJECT {"project":"Mobile"}')).toBeTruthy();
	});

	it('saves the entries, says how far it is, then closes on one success toast', async () => {
		const firstSave = pendingSave();
		mockUpdateTimeLog.mockReturnValueOnce(firstSave.promise);
		const { closeModal, onFinished } = renderDialog([logOf('a'), logOf('b')]);

		fireEvent.click(screen.getByRole('tab', { name: YES }));
		fireEvent.click(updateButton());

		await waitFor(() => expect(mockUpdateTimeLog).toHaveBeenCalledTimes(1));
		expect(screen.getByText('dashboard.timesheets.BULK_EDIT.PROGRESS {"done":1,"total":2}')).toBeTruthy();
		expect(updateButton().disabled).toBe(true);
		expect(screen.getByRole<HTMLButtonElement>('button', { name: 'common.CANCEL' }).disabled).toBe(true);
		expect(screen.getByRole('dialog').getAttribute('data-closable')).toBe('false');
		expect(screen.getByRole('group', { name: BILLABLE }).closest('fieldset')?.disabled).toBe(true);

		await act(async () => {
			firstSave.settle();
		});
		await waitFor(() => expect(closeModal).toHaveBeenCalledTimes(1));

		expect(mockUpdateTimeLog).toHaveBeenCalledTimes(2);
		expect(mockToastSuccess).toHaveBeenCalledWith('dashboard.timesheets.BULK_EDIT.UPDATED {"count":2}');
		expect(onFinished).toHaveBeenCalledWith(expect.objectContaining({ releasedLogIds: ['a', 'b'] }));
	});

	it('stays open on its report when an entry was not updated', async () => {
		mockUpdateTimeLog.mockRejectedValueOnce(new Error('Failed to update time-log', { cause: { status: 500 } }));
		const { closeModal } = renderDialog([logOf('a'), logOf('b')]);

		fireEvent.click(screen.getByRole('tab', { name: YES }));
		fireEvent.click(updateButton());

		const headline = 'dashboard.timesheets.BULK_EDIT.UPDATED_PARTLY {"updated":1,"notUpdated":1}';
		await waitFor(() => expect(screen.getByText(headline)).toBeTruthy());
		expect(
			screen.getByText('dashboard.timesheets.BULK_EDIT.REASON.FAILED {"count":1} toasts.REASONS.SERVER')
		).toBeTruthy();
		expect(screen.getByText('dashboard.timesheets.BULK_EDIT.STILL_SELECTED')).toBeTruthy();
		expect(mockToastWarning).toHaveBeenCalledWith(headline);
		expect(closeModal).not.toHaveBeenCalled();
		expect(screen.queryByRole('combobox', { name: TASK })).toBeNull();

		fireEvent.click(screen.getByRole('button', { name: 'common.CLOSE' }));

		expect(closeModal).toHaveBeenCalledTimes(1);
	});
});
