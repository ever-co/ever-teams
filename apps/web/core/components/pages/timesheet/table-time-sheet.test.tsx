/**
 * @jest-environment jsdom
 *
 * The timesheet list gave approve, reject and the status menu of a row only to CAN_APPROVE_TIMESHEET holders, so a
 * team manager could not approve the timesheets of the members of their team, which PUT /timesheet/status takes from
 * them as approved or denied. They get both on their members' timesheets, never on their own, and approvers and the
 * managing roles keep what they had.
 */
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';

import { organizationTeamsState, selectTimesheetIdState } from '@/core/stores';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganizationTeam, TUser } from '@/core/types/schemas';
import { DataTableTimeSheet, StatusTask } from './table-time-sheet';

const mockPermissions: { current: string[] } = { current: [] };
const mockUser: { current: TUser | null } = { current: null };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('@/core/hooks', () => {
	const filterOptions = jest.requireActual('@/core/hooks/activities/use-timelog-filter-options');
	return {
		useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() }),
		useTimelogFilterOptions: filterOptions.useTimelogFilterOptions
	};
});
jest.mock('@/core/hooks/timesheet', () => ({ useUpdateTimeLogMutation: () => ({ mutateAsync: jest.fn() }) }));
jest.mock('@/core/hooks/timesheet/use-update-timesheet', () => ({
	useUpdateTimesheet: () => ({ updateTimesheetStatus: jest.fn() })
}));
jest.mock('@/core/hooks/timesheet/use-delete-timesheet', () => ({
	useDeleteTimesheet: () => ({ deleteTaskTimesheet: jest.fn(), loadingDeleteTimesheet: false })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions.current })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: mockUser.current }) }));
jest.mock('@/core/lib/helpers/index', () => ({ formatDate: (date: string) => date }));
jest.mock('@/core/components', () => ({
	AlertConfirmationModal: () => null,
	statusColor: () => ({ bg: '', bgOpacity: '', text: '' })
}));
jest.mock('@/core/components/timesheet', () => {
	const actions = jest.requireActual('@/core/components/timesheet/timesheet-action');
	return {
		EditTaskModal: () => null,
		RejectSelectedModal: () => null,
		EmployeeAvatar: () => null,
		ProjectLogo: () => null,
		getTimesheetButtons: actions.getTimesheetButtons,
		statusTable: actions.statusTable
	};
});
jest.mock('../../integration/calendar', () => ({ ConfirmStatusChange: () => null, statusOptions: [] }));
jest.mock('../../tasks/task-displays', () => ({
	DisplayTimeForTimesheet: () => null,
	TaskNameInfoDisplay: () => null,
	TotalDurationByDate: () => null,
	TotalTimeDisplay: () => null
}));
// The rows of a group stay out of the header checks; StatusTask is rendered on its own below
jest.mock('@/core/components/common/accordion', () => {
	const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
	return { Accordion: Pass, AccordionItem: Pass, AccordionTrigger: Pass, AccordionContent: () => null };
});
jest.mock('@/core/components/common/dropdown-menu', () => {
	const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
	return {
		DropdownMenu: Pass,
		DropdownMenuTrigger: Pass,
		DropdownMenuContent: Pass,
		DropdownMenuItem: Pass,
		DropdownMenuPortal: Pass,
		DropdownMenuSeparator: () => null,
		DropdownMenuSub: Pass,
		DropdownMenuSubContent: Pass,
		DropdownMenuSubTrigger: Pass
	};
});

const APPROVE = 'pages.timesheet.TIMESHEET_ACTION_APPROVE_SELECTED';
const REJECT = 'pages.timesheet.TIMESHEET_ACTION_REJECT_SELECTED';
const DELETE = 'pages.timesheet.TIMESHEET_ACTION_DELETE_SELECTED';
const CHANGE_STATUS = 'common.CHANGE_STATUS';

const userWithRole = (roleName: string) =>
	({ id: 'user-manager', employee: { id: 'employee-manager' }, role: { name: roleName } }) as unknown as TUser;

const pendingLogOf = (employeeId: string) =>
	({
		id: `log-${employeeId}`,
		employeeId,
		timesheetId: `timesheet-${employeeId}`,
		timesheet: { id: `timesheet-${employeeId}`, status: 'PENDING' },
		employee: { fullName: employeeId, user: {} }
	}) as unknown as ITimeLog;

const MEMBER_LOG = pendingLogOf('employee-member');
const OWN_LOG = pendingLogOf('employee-manager');

const MANAGED_TEAM = {
	id: 'team-1',
	name: 'Team',
	members: [
		{ employeeId: 'employee-manager', isManager: true },
		{ employeeId: 'employee-member', isManager: false }
	]
} as unknown as TOrganizationTeam;

function renderWithStore(ui: ReactNode, selection: ITimeLog[] = []) {
	const store = createStore();
	store.set(organizationTeamsState, [MANAGED_TEAM]);
	store.set(selectTimesheetIdState, selection);
	render(<Provider store={store}>{ui}</Provider>);
}

function renderTable(log: ITimeLog, selection: ITimeLog[] = []) {
	const data = [{ date: '2026-10-20', tasks: [log] }];
	renderWithStore(<DataTableTimeSheet data={data} user={mockUser.current} />, selection);
}

describe('DataTableTimeSheet group buttons', () => {
	beforeEach(() => {
		mockPermissions.current = ['TIME_TRACKER'];
		mockUser.current = userWithRole('EMPLOYEE');
	});

	it('gives a team manager approve and reject, without delete, on a member’s timesheet', () => {
		renderTable(MEMBER_LOG);

		expect(screen.getByText(APPROVE)).toBeTruthy();
		expect(screen.getByText(REJECT)).toBeTruthy();
		expect(screen.queryByText(DELETE)).toBeNull();
	});

	it('gives the team manager nothing on their own timesheet', () => {
		renderTable(OWN_LOG);

		expect(screen.queryByText(APPROVE)).toBeNull();
		expect(screen.queryByText(REJECT)).toBeNull();
	});

	it('hides approve and reject while the selection holds the manager’s own entry', () => {
		renderTable(MEMBER_LOG, [OWN_LOG]);

		expect(screen.queryByText(APPROVE)).toBeNull();
		expect(screen.queryByText(REJECT)).toBeNull();
	});

	it('keeps every button for an admin approver, on their own timesheet too', () => {
		mockPermissions.current = ['CAN_APPROVE_TIMESHEET'];
		mockUser.current = userWithRole('ADMIN');
		renderTable(OWN_LOG);

		expect(screen.getByText(APPROVE)).toBeTruthy();
		expect(screen.getByText(REJECT)).toBeTruthy();
		expect(screen.getByText(DELETE)).toBeTruthy();
	});

	it('gives no group button to an approver outside the managing roles, as before', () => {
		mockPermissions.current = ['CAN_APPROVE_TIMESHEET'];
		renderTable(MEMBER_LOG);

		expect(screen.queryByText(APPROVE)).toBeNull();
		expect(screen.queryByText(DELETE)).toBeNull();
	});
});

describe('StatusTask', () => {
	beforeEach(() => {
		mockPermissions.current = ['TIME_TRACKER'];
		mockUser.current = userWithRole('EMPLOYEE');
	});

	it('offers a team manager approved and denied only, on a member’s entry', () => {
		renderWithStore(<StatusTask timeLog={MEMBER_LOG} onReject={jest.fn()} />);

		expect(screen.getByText(CHANGE_STATUS)).toBeTruthy();
		expect(screen.getByText('APPROVED')).toBeTruthy();
		expect(screen.getByText('DENIED')).toBeTruthy();
		expect(screen.queryByText('PENDING')).toBeNull();
	});

	it('offers the team manager no status change on their own entry', () => {
		renderWithStore(<StatusTask timeLog={OWN_LOG} onReject={jest.fn()} />);

		expect(screen.queryByText(CHANGE_STATUS)).toBeNull();
	});

	it('offers an approver every status, as before', () => {
		mockPermissions.current = ['CAN_APPROVE_TIMESHEET'];
		renderWithStore(<StatusTask timeLog={OWN_LOG} onReject={jest.fn()} />);

		for (const status of ['PENDING', 'IN REVIEW', 'APPROVED', 'DRAFT', 'DENIED']) {
			expect(screen.getByText(status)).toBeTruthy();
		}
	});
});
