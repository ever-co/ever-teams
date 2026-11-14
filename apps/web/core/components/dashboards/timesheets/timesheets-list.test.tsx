/** @jest-environment jsdom */

import { fireEvent, render, screen, within } from '@testing-library/react';
import type { SimilarEntryGrouping } from '@/core/hooks/dashboards/timesheets/use-similar-entry-grouping';
import type { TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import { groupLogsByWorkDay, type TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		const parts = Object.entries(values).map(([name, value]) => `${name}=${String(value)}`);
		return `${key}(${parts.join(',')})`;
	}
}));
jest.mock('@/core/components/tasks/drawer/task-drawer-link', () => ({
	TaskDrawerLink: ({ children }: { children: React.ReactNode }) => <a href="#task">{children}</a>
}));
jest.mock('@/core/components/tasks/task-property-icon', () => ({ TaskPropertyIcon: () => null }));
jest.mock('./timesheet-entry-group-menu', () => ({ TimesheetEntryGroupMenu: () => null }));
jest.mock('./time-entry-reuse', () => ({ TimeEntryReuseMenuItems: () => null }));
jest.mock('@/core/components/layouts/default-layout', () => ({ PageLayout: () => null }));
// The page hook reads the session and the team; the list only takes its page size and its edit rule.
jest.mock('@/core/hooks/dashboards/timesheets/use-timesheets-page', () => ({
	DAYS_PER_STEP: 20,
	canEditLog: () => true
}));

import { TimesheetsList } from './timesheets-list';

const formatters = {
	time: (date: Date) => date.toISOString().slice(11, 16),
	dayDate: (date: Date) => date.toISOString().slice(0, 10),
	weekday: () => 'Tuesday',
	weekdayShort: () => 'Tue',
	monthTitle: () => 'November 2026',
	dayNumber: () => '10'
} as TimesheetFormatters;

const MEMBER: TimesheetPermissions = {
	hasOrganizationRole: false,
	isManage: false,
	canApprove: false,
	userId: 'marie-user',
	employeeId: 'marie'
};

function logOf(id: string, hour: number, overrides: Partial<ITimeLog> = {}): ITimeLog {
	return {
		id,
		duration: 1800,
		version: '1',
		employeeId: 'marie',
		taskId: 'fix-login',
		task: { id: 'fix-login', title: 'Fix the login page' } as ITimeLog['task'],
		projectId: 'site',
		isBillable: true,
		startedAt: new Date(2026, 10, 10, hour),
		stoppedAt: new Date(2026, 10, 10, hour, 30),
		timesheet: { id: 'sheet', status: ETimesheetStatus.PENDING } as ITimeLog['timesheet'],
		...overrides
	};
}

const SIX = [8, 9, 10, 11, 13, 14].map((hour) => logOf(`log-${hour}`, hour));
const NOT_BILLABLE = logOf('log-16', 16, { isBillable: false });
const DAYS = groupLogsByWorkDay([...SIX, NOT_BILLABLE]);

function groupingOf(isGrouping: boolean, isEveryGroupOpen = false): SimilarEntryGrouping {
	return {
		isGrouping,
		setIsGrouping: jest.fn(),
		isGroupOpen: () => isEveryGroupOpen,
		toggleGroup: jest.fn()
	};
}

function renderList(grouping: SimilarEntryGrouping) {
	render(
		<TimesheetsList
			days={DAYS}
			visibleDayCount={20}
			collapsedDayKeys={[]}
			onToggleDay={jest.fn()}
			onShowMoreDays={jest.fn()}
			onSelectDay={jest.fn()}
			showsMember={false}
			selectedIdSet={new Set()}
			permissions={MEMBER}
			formatters={formatters}
			handlers={{
				toggleLog: jest.fn(),
				approve: jest.fn(),
				reject: jest.fn(),
				changeStatus: jest.fn(),
				setBillable: jest.fn(),
				edit: jest.fn(),
				remove: jest.fn()
			}}
			focusedDayKey={null}
			onFocusHandled={jest.fn()}
			sort={null}
			onSort={jest.fn()}
			emptyContent={null}
			grouping={grouping}
			groupHandlers={{
				hasBillableChange: () => true,
				setBillable: jest.fn(),
				changeStatus: jest.fn(),
				remove: jest.fn()
			}}
		/>
	);
}

function entryRows() {
	return screen
		.getAllByRole('row')
		.filter((row) => within(row).queryByRole('checkbox', { name: /SELECT_LOG/ }) !== null);
}

describe('TimesheetsList with similar entries', () => {
	it('shows six entries of the same work as one row, and the non billable one on its own', () => {
		renderList(groupingOf(true));

		expect(screen.getAllByText('dashboard.timesheets.SIMILAR.ENTRY_COUNT(count=6)').length).toBeGreaterThan(0);
		expect(entryRows()).toHaveLength(1);
		expect(screen.getByText('3h 0m')).toBeTruthy();
	});

	it('keeps the day total of every entry', () => {
		renderList(groupingOf(true));

		expect(screen.getByText('3h 30m')).toBeTruthy();
	});

	it('shows the six entries under their row once it is open', () => {
		renderList(groupingOf(true, true));

		expect(entryRows()).toHaveLength(7);
	});

	it('opens a group from the control before its task', () => {
		const grouping = groupingOf(true);
		renderList(grouping);

		fireEvent.click(
			screen.getByRole('button', { name: 'dashboard.timesheets.SIMILAR.SHOW_ENTRIES(task=Fix the login page)' })
		);

		expect(grouping.toggleGroup).toHaveBeenCalledTimes(1);
	});

	it('shows one row per entry with grouping off, as before', () => {
		renderList(groupingOf(false));

		expect(entryRows()).toHaveLength(7);
		expect(screen.queryByText('dashboard.timesheets.SIMILAR.ENTRY_COUNT(count=6)')).toBeNull();
	});
});
