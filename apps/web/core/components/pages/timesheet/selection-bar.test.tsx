/**
 * @jest-environment jsdom
 *
 * The selection bar of the timesheet showed approve and reject only with CAN_APPROVE_TIMESHEET, so a team manager
 * could not approve the entries of the members of their team, which PUT /timesheet/status takes from them. It shows
 * both for a selection of members' entries, never for the manager's own, and keeps them for approvers.
 */
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';

import { organizationTeamsState } from '@/core/stores';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganizationTeam } from '@/core/types/schemas';
import { SelectedTimesheet } from './selection-bar';

const mockPermissions: { current: string[] } = { current: [] };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/hooks', () => ({
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() })
}));
jest.mock('@/core/hooks/timesheet/use-update-timesheet', () => ({
	useUpdateTimesheet: () => ({ updateTimesheetStatus: jest.fn() })
}));
jest.mock('@/core/hooks/timesheet/use-delete-timesheet', () => ({
	useDeleteTimesheet: () => ({ deleteTaskTimesheet: jest.fn(), loadingDeleteTimesheet: false })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions.current })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-manager', employee: { id: 'employee-manager' } } })
}));
jest.mock('../../features/timesheet/reject-selected-modal', () => ({ RejectSelectedModal: () => null }));
jest.mock('@/core/components/common/alert-dialog-confirmation', () => ({ AlertConfirmationModal: () => null }));

const APPROVE = 'pages.timesheet.TIMESHEET_ACTION_APPROVE_SELECTED';
const REJECT = 'pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED';
const DELETE = 'pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED';

const logOf = (employeeId: string) =>
	({ id: `log-${employeeId}`, employeeId, timesheetId: `timesheet-${employeeId}` }) as unknown as ITimeLog;

const teamManagedBy = (isManager: boolean) =>
	({
		id: 'team-1',
		name: 'Team',
		members: [
			{ employeeId: 'employee-manager', isManager },
			{ employeeId: 'employee-member', isManager: false }
		]
	}) as unknown as TOrganizationTeam;

const MEMBER_LOG = logOf('employee-member');
const OWN_LOG = logOf('employee-manager');
const MANAGED_TEAM = teamManagedBy(true);
const UNMANAGED_TEAM = teamManagedBy(false);

function renderSelectionBar(selection: ITimeLog[], teams: TOrganizationTeam[]) {
	const store = createStore();
	store.set(organizationTeamsState, teams);
	render(
		<Provider store={store}>
			<SelectedTimesheet selectTimesheetId={selection} setSelectTimesheetId={jest.fn()} />
		</Provider>
	);
}

describe('SelectedTimesheet approve and reject', () => {
	beforeEach(() => {
		mockPermissions.current = ['TIME_TRACKER'];
	});

	it('shows them to a team manager for the entries of a member of their team', () => {
		renderSelectionBar([MEMBER_LOG], [MANAGED_TEAM]);

		expect(screen.getByText(APPROVE)).toBeTruthy();
		expect(screen.getByText(REJECT)).toBeTruthy();
	});

	it('hides them when the selection holds the manager’s own entries, and keeps delete', () => {
		renderSelectionBar([MEMBER_LOG, OWN_LOG], [MANAGED_TEAM]);

		expect(screen.queryByText(APPROVE)).toBeNull();
		expect(screen.queryByText(REJECT)).toBeNull();
		expect(screen.getByText(DELETE)).toBeTruthy();
	});

	it('hides them from a member who does not manage the team', () => {
		renderSelectionBar([MEMBER_LOG], [UNMANAGED_TEAM]);

		expect(screen.queryByText(APPROVE)).toBeNull();
		expect(screen.queryByText(REJECT)).toBeNull();
	});

	it('keeps them for a CAN_APPROVE_TIMESHEET holder, on their own entries too', () => {
		mockPermissions.current = ['CAN_APPROVE_TIMESHEET'];
		renderSelectionBar([OWN_LOG], []);

		expect(screen.getByText(APPROVE)).toBeTruthy();
		expect(screen.getByText(REJECT)).toBeTruthy();
	});
});
