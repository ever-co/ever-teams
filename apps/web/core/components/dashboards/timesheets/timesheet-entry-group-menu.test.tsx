/** @jest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import type { TimesheetEntryGroup } from '@/core/lib/utils/dashboards/timesheet-entry-groups';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
// The menu's primitives open in a portal on a pointer gesture jsdom does not have: every item is drawn at once here.
jest.mock('@/core/components/common/dropdown-menu', () => {
	const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
	return {
		DropdownMenu: Pass,
		DropdownMenuTrigger: Pass,
		DropdownMenuContent: Pass,
		DropdownMenuSub: Pass,
		DropdownMenuSubTrigger: Pass,
		DropdownMenuSubContent: Pass,
		DropdownMenuSeparator: () => <hr />,
		DropdownMenuItem: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
			<div role="menuitem" onClick={onClick}>
				{children}
			</div>
		)
	};
});

import { TimesheetEntryGroupMenu } from './timesheet-entry-group-menu';

const MANAGER: TimesheetPermissions = {
	hasOrganizationRole: true,
	isManage: true,
	canApprove: true,
	userId: 'manager',
	employeeId: 'manager-employee'
};

const MEMBER: TimesheetPermissions = {
	hasOrganizationRole: false,
	isManage: false,
	canApprove: false,
	userId: 'marie-user',
	employeeId: 'marie'
};

/** Kofi manages Marie's team by the team's manager flag; his employee role does not hold CAN_APPROVE_TIMESHEET. */
const TEAM_MANAGER: TimesheetPermissions = {
	hasOrganizationRole: false,
	isManage: true,
	canApprove: false,
	userId: 'kofi-user',
	employeeId: 'kofi',
	reviewer: {
		permissions: ['TIME_TRACKER'],
		employeeId: 'kofi',
		teams: [{ members: [{ employeeId: 'kofi', isManager: true }, { employeeId: 'marie' }] }]
	}
};

function logOf(id: string, employeeId = 'marie'): ITimeLog {
	return {
		id,
		duration: 3600,
		version: '1',
		employeeId,
		isBillable: true,
		timesheet: { id: 'sheet', status: ETimesheetStatus.PENDING } as ITimeLog['timesheet']
	};
}

function groupOf(logs: ITimeLog[]): TimesheetEntryGroup {
	return { key: 'day|work', logs, firstStart: null, lastEnd: null, isRunning: false, totalSeconds: 0 };
}

function renderMenu(
	permissions: TimesheetPermissions,
	group = groupOf([logOf('a'), logOf('b')]),
	hasBillableChange = true
) {
	const handlers = {
		hasBillableChange: jest.fn(() => hasBillableChange),
		setBillable: jest.fn(),
		changeStatus: jest.fn(),
		remove: jest.fn()
	};
	render(<TimesheetEntryGroupMenu group={group} permissions={permissions} handlers={handlers} />);
	return { handlers, group };
}

function menuItemNamed(name: string) {
	return screen.getAllByRole('menuitem').find((item) => item.textContent === name);
}

describe('TimesheetEntryGroupMenu', () => {
	it('changes the status of every entry for someone who may approve', () => {
		const { handlers, group } = renderMenu(MANAGER);

		const approved = menuItemNamed('dashboard.timesheets.STATUS.APPROVED');
		expect(approved).toBeTruthy();
		fireEvent.click(approved as HTMLElement);

		expect(handlers.changeStatus).toHaveBeenCalledWith(group, ETimesheetStatus.APPROVED);
	});

	it('offers no status to someone who may not approve', () => {
		renderMenu(MEMBER);

		expect(screen.queryByText('common.CHANGE_STATUS')).toBeNull();
	});

	it("offers a team manager without CAN_APPROVE_TIMESHEET Approved and Rejected on a member's entries, never on his own (#5622)", () => {
		const statusLabels = () =>
			screen
				.getAllByRole('menuitem')
				.map((item) => item.textContent)
				.filter((text) => text?.startsWith('dashboard.timesheets.STATUS.'));

		const memberEntries = renderMenu(TEAM_MANAGER);
		expect(statusLabels()).toEqual(['dashboard.timesheets.STATUS.APPROVED', 'dashboard.timesheets.STATUS.DENIED']);
		fireEvent.click(menuItemNamed('dashboard.timesheets.STATUS.APPROVED') as HTMLElement);
		expect(memberEntries.handlers.changeStatus).toHaveBeenCalledWith(
			memberEntries.group,
			ETimesheetStatus.APPROVED
		);
		cleanup();

		renderMenu(TEAM_MANAGER, groupOf([logOf('own-a', 'kofi'), logOf('own-b', 'kofi')]));
		expect(screen.queryByText('common.CHANGE_STATUS')).toBeNull();
	});

	it('changes the billable state of every entry', () => {
		const { handlers, group } = renderMenu(MEMBER);

		fireEvent.click(menuItemNamed('pages.timesheet.BILLABLE.NO') as HTMLElement);

		expect(handlers.setBillable).toHaveBeenCalledWith(group, false);
	});

	it('offers no Billable when no entry of the group could be changed', () => {
		renderMenu(MEMBER, undefined, false);

		expect(screen.queryByText('dashboard.timesheets.BILLABLE')).toBeNull();
		expect(menuItemNamed('pages.timesheet.BILLABLE.NO')).toBeUndefined();
	});

	it('deletes every entry when each of them may be deleted', () => {
		const { handlers, group } = renderMenu(MEMBER);

		fireEvent.click(menuItemNamed('common.DELETE') as HTMLElement);

		expect(handlers.remove).toHaveBeenCalledWith(group);
	});

	it("offers no delete when one of the entries is someone else's", () => {
		renderMenu(MEMBER, groupOf([logOf('a'), logOf('b', 'paul')]));

		expect(menuItemNamed('common.DELETE')).toBeUndefined();
	});
});
