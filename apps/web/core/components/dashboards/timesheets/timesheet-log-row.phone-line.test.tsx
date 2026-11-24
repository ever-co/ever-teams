/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import type { TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components/tasks/drawer/task-drawer-link', () => ({
	TaskDrawerLink: ({ children }: { children: React.ReactNode }) => <a href="#task">{children}</a>
}));
jest.mock('@/core/components/tasks/task-property-icon', () => ({ TaskPropertyIcon: () => null }));
jest.mock('./time-entry-reuse', () => ({ TimeEntryReuseMenuItems: () => null }));
jest.mock('@/core/hooks/dashboards/timesheets/use-timesheets-page', () => ({ canEditLog: () => true }));

import { TimesheetLogRow } from './timesheet-log-row';

const formatters = {
	time: (date: Date) => date.toISOString().slice(11, 16)
} as TimesheetFormatters;

const OWNER: TimesheetPermissions = {
	hasOrganizationRole: true,
	isManage: true,
	canApprove: true,
	userId: 'owner-user',
	employeeId: 'owner'
};

const REJECTED_ENTRY: ITimeLog = {
	id: 'log-1',
	duration: 2700,
	version: '1',
	employeeId: 'ruth',
	employee: { id: 'ruth', fullName: 'Ruth Baker' } as ITimeLog['employee'],
	taskId: 'fix-login',
	task: { id: 'fix-login', title: 'Fix the login page' } as ITimeLog['task'],
	projectId: 'site',
	isBillable: true,
	startedAt: new Date(2026, 10, 10, 9),
	stoppedAt: new Date(2026, 10, 10, 9, 45),
	timesheet: { id: 'sheet', status: ETimesheetStatus.DENIED } as ITimeLog['timesheet']
};

const NO_HANDLERS = {
	toggleLog: jest.fn(),
	approve: jest.fn(),
	reject: jest.fn(),
	changeStatus: jest.fn(),
	setBillable: jest.fn(),
	edit: jest.fn(),
	remove: jest.fn()
};

function renderRow(isNested: boolean) {
	render(
		<TimesheetLogRow
			log={REJECTED_ENTRY}
			isSelected={false}
			showsMember
			permissions={OWNER}
			formatters={formatters}
			handlers={NO_HANDLERS}
			isNested={isNested}
		/>
	);
}

const classesOf = (element: Element) => element.className.split(/\s+/);

/** The line a phone shows under the task: the status, the time and the member. The wide columns carry them elsewhere. */
function phoneLine() {
	const statuses = screen.getAllByText('dashboard.timesheets.STATUS.DENIED');
	const lines = statuses.map((status) => status.parentElement?.parentElement as HTMLElement);
	const line = lines.find((candidate) => classesOf(candidate).includes('lg:hidden'));
	if (!line) {
		throw new Error('the row has no phone line');
	}
	return line;
}

/**
 * One entry of Reports, Timesheets, List on a phone (#5697): its line kept the status, the time and the member side by
 * side, and to make room for the time it cut the status to "R." and the member to three letters.
 */
describe("the phone line of a timesheet entry's row", () => {
	it('wraps, so the status and the member keep their words', () => {
		renderRow(false);

		expect(classesOf(phoneLine())).toEqual(expect.arrayContaining(['flex-wrap', 'gap-y-1']));
	});

	it('never shrinks the status to make room for the time', () => {
		renderRow(false);

		const status = phoneLine().querySelector('.chip-3d') as HTMLElement;

		expect(classesOf(status)).toContain('shrink-0');
	});

	it('names the member on it', () => {
		renderRow(false);

		expect(phoneLine().textContent).toContain('Ruth Baker');
	});

	it('still wraps under the row of a group of similar entries', () => {
		renderRow(true);

		expect(classesOf(phoneLine())).toContain('flex-wrap');
	});
});
