/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { EditTaskModal } from './edit-task-modal';

type MockChildrenProps = { children?: React.ReactNode };

type MockOverlapRequest = {
	employeeId: string;
	periods: Array<{ start: Date; end: Date }>;
	ignoredLogId?: string;
	save: () => void | Promise<void>;
};

const mockUpdateTimeLog = jest.fn();
// The overlap lookup finds nothing unless a test holds the save: the guard has its own tests
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
// The entry keeps its task here: changing it has its own tests (edit-task-modal.task-change.test.tsx)
jest.mock('@/core/hooks/timesheet/use-time-log-task-choice', () => ({
	useTimeLogTaskChoice: () => ({
		canChangeTask: false,
		taskChoices: [],
		taskId: '',
		pickTask: jest.fn(),
		changedFields: {},
		projectChoices: [],
		shownProject: null,
		followedProjectName: null
	})
}));
jest.mock('@/core/hooks', () => ({ useMyRolePermissionsQuery: () => ({ myPermissions: [] }) }));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({ organizationProjects: [] })
}));
jest.mock('jotai', () => ({ useAtomValue: () => ({ members: [] }) }));
jest.mock('@/core/stores', () => ({ activeTeamState: 'activeTeamState' }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { success: jest.fn() } }));
jest.mock('@/core/lib/utils', () => ({ clsxm: () => '' }));
jest.mock('@/core/lib/helpers/index', () => ({
	differenceBetweenHours: () => 0,
	secondsToTime: () => ({ hours: 0, minutes: 0 }),
	toDate: (value: string | Date) => new Date(value),
	formatTimeFromDate: (value: string | Date) => new Date(value).toTimeString().slice(0, 5)
}));
jest.mock('@/core/components', () => ({
	Modal: ({ children }: MockChildrenProps) => <>{children}</>,
	modalFooterClass: '',
	modalPrimaryActionClass: '',
	modalSecondaryActionClass: ''
}));
jest.mock('@/core/components/icons', () => ({ Clock: () => null, Spinner: () => null }));
jest.mock('@/core/components/common/input', () => ({ controlRecipe: '' }));
jest.mock('@/core/components/duplicated-components/_button', () => ({
	Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />
}));
jest.mock('@/core/components/teams/manage-member-component', () => ({
	getNestedValue: () => '',
	ManageOrMemberComponent: () => null
}));
jest.mock('../../pages/timesheet/timesheet-filter-date', () => ({ DatePickerFilter: () => null }));
jest.mock('../../timesheet/timesheet-action', () => ({ statusTable: [] }));
jest.mock('../../common/multiple-select', () => ({ CustomSelect: () => null }));
jest.mock('../../tasks/task-displays', () => ({ TaskNameInfoDisplay: () => null }));

const startedAt = new Date(2026, 10, 10, 9, 0);
const stoppedAt = new Date(2026, 10, 10, 10, 0);
const editedLog = {
	id: 'log-1',
	employeeId: 'employee-a',
	startedAt,
	stoppedAt,
	description: 'Call with the client',
	isBillable: true
} as unknown as ITimeLog;

const closeModal = jest.fn();

function renderEditDialog() {
	return render(<EditTaskModal isOpen closeModal={closeModal} timeLogData={editedLog} />);
}

function submitEditDialog() {
	const saveButton = screen.getByRole('button', { name: 'common.SAVE' });
	const form = saveButton.closest('form') as HTMLFormElement;
	fireEvent.submit(form);
}

describe('EditTaskModal overlap with time already recorded', () => {
	beforeEach(() => {
		mockUpdateTimeLog.mockResolvedValue(undefined);
	});

	it('hands the save to the overlap check, the edited entry left out, and sends nothing itself', () => {
		mockSaveAfterCheck.mockImplementationOnce(() => undefined);
		renderEditDialog();

		fireEvent.change(screen.getByLabelText('manualTime.END_TIME'), { target: { value: '11:30' } });
		submitEditDialog();

		expect(mockUpdateTimeLog).not.toHaveBeenCalled();
		expect(mockSaveAfterCheck).toHaveBeenCalledTimes(1);
		const [request] = mockSaveAfterCheck.mock.calls[0];
		expect(request.employeeId).toBe('employee-a');
		expect(request.ignoredLogId).toBe('log-1');
		expect(request.periods).toEqual([{ start: startedAt, end: new Date(2026, 10, 10, 11, 30) }]);

		// The save the check held is the dialog's own, for the interval that was checked
		void request.save();

		expect(mockUpdateTimeLog).toHaveBeenCalledWith(
			expect.objectContaining({ timeLogId: 'log-1', startedAt, stoppedAt: new Date(2026, 10, 10, 11, 30) })
		);
	});

	it('saves as before when the check finds nothing', () => {
		renderEditDialog();

		submitEditDialog();

		expect(mockUpdateTimeLog).toHaveBeenCalledWith(
			expect.objectContaining({ timeLogId: 'log-1', employeeId: 'employee-a', startedAt, stoppedAt })
		);
	});
});
