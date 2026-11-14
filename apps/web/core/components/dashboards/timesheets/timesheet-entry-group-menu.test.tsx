/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
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

function renderMenu(permissions: TimesheetPermissions, group = groupOf([logOf('a'), logOf('b')])) {
	const handlers = { setBillable: jest.fn(), changeStatus: jest.fn(), remove: jest.fn() };
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

	it('changes the billable state of every entry', () => {
		const { handlers, group } = renderMenu(MEMBER);

		fireEvent.click(menuItemNamed('pages.timesheet.BILLABLE.NO') as HTMLElement);

		expect(handlers.setBillable).toHaveBeenCalledWith(group, false);
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
