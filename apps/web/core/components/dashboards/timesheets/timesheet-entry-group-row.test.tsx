/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import type { TimesheetEntryGroup } from '@/core/lib/utils/dashboards/timesheet-entry-groups';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
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
// jsdom has no PointerEvent, which the checkbox of the app dispatches on a click: a native one stands in.
jest.mock('@/core/components/common/checkbox', () => ({
	Checkbox: ({
		checked,
		indeterminate,
		onCheckedChange,
		'aria-label': label
	}: {
		checked?: boolean;
		indeterminate?: boolean;
		onCheckedChange?: (next: boolean) => void;
		'aria-label'?: string;
	}) => {
		let ariaChecked = String(Boolean(checked));
		if (indeterminate) {
			ariaChecked = 'mixed';
		}
		return (
			<input
				type="checkbox"
				aria-label={label}
				aria-checked={ariaChecked as 'true' | 'false' | 'mixed'}
				checked={Boolean(checked)}
				onChange={() => onCheckedChange?.(!checked)}
			/>
		);
	}
}));

import { TimesheetEntryGroupRow } from './timesheet-entry-group-row';

const formatters = {
	time: (date: Date) => date.toISOString().slice(11, 16),
	dayDate: (date: Date) => date.toISOString().slice(0, 10)
} as TimesheetFormatters;

function logOf(id: string, startHour: number): ITimeLog {
	return {
		id,
		duration: 3600,
		version: '1',
		employeeId: 'marie',
		taskId: 'fix-login',
		task: { id: 'fix-login', title: 'Fix the login page' } as ITimeLog['task'],
		projectId: 'site',
		isBillable: true,
		startedAt: new Date(Date.UTC(2026, 10, 10, startHour)),
		stoppedAt: new Date(Date.UTC(2026, 10, 10, startHour + 1)),
		timesheet: { id: 'sheet', status: ETimesheetStatus.PENDING } as ITimeLog['timesheet']
	};
}

function groupOf(overrides: Partial<TimesheetEntryGroup> = {}): TimesheetEntryGroup {
	const logs = [logOf('a', 9), logOf('b', 11), logOf('c', 14)];
	return {
		key: '2026-11-10|fix-login',
		logs,
		firstStart: new Date(Date.UTC(2026, 10, 10, 9)),
		lastEnd: new Date(Date.UTC(2026, 10, 10, 15)),
		isRunning: false,
		totalSeconds: 3 * 3600,
		...overrides
	};
}

function renderRow(
	options: { group?: TimesheetEntryGroup; isOpen?: boolean; selectedIds?: string[]; showsMember?: boolean } = {}
) {
	const onToggle = jest.fn();
	const onSelect = jest.fn();
	const group = options.group ?? groupOf();
	render(
		<TimesheetEntryGroupRow
			group={group}
			isOpen={options.isOpen ?? false}
			onToggle={onToggle}
			selectedIdSet={new Set(options.selectedIds ?? [])}
			onSelect={onSelect}
			showsMember={options.showsMember ?? false}
			formatters={formatters}
			menu={<button type="button">group menu</button>}
		/>
	);
	return { onToggle, onSelect, group };
}

describe('TimesheetEntryGroupRow', () => {
	it('names the task once with the number of its entries, their range and their total', () => {
		renderRow();

		expect(screen.getByText('Fix the login page')).toBeTruthy();
		expect(screen.getAllByText('dashboard.timesheets.SIMILAR.ENTRY_COUNT(count=3)').length).toBeGreaterThan(0);
		expect(screen.getAllByText('09:00 – 15:00').length).toBeGreaterThan(0);
		expect(screen.getByText('3h 0m')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'group menu' })).toBeTruthy();
	});

	it('says a group with a running entry runs until now', () => {
		renderRow({ group: groupOf({ isRunning: true, lastEnd: null }) });

		expect(screen.getAllByText('09:00 – dashboard.timesheets.RUNNING').length).toBeGreaterThan(0);
	});

	it('opens and closes on its entries from the control before the task', () => {
		const { onToggle } = renderRow();
		const toggle = screen.getByRole('button', {
			name: 'dashboard.timesheets.SIMILAR.SHOW_ENTRIES(task=Fix the login page)'
		});

		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		fireEvent.click(toggle);

		expect(onToggle).toHaveBeenCalledWith('2026-11-10|fix-login');
	});

	it('names the control for closing once the group is open', () => {
		renderRow({ isOpen: true });

		const toggle = screen.getByRole('button', {
			name: 'dashboard.timesheets.SIMILAR.HIDE_ENTRIES(task=Fix the login page)'
		});
		expect(toggle.getAttribute('aria-expanded')).toBe('true');
	});

	it('selects every entry of the group from its checkbox', () => {
		const { onSelect } = renderRow();

		fireEvent.click(
			screen.getByRole('checkbox', {
				name: 'dashboard.timesheets.SIMILAR.SELECT_GROUP(count=3,task=Fix the login page)'
			})
		);

		expect(onSelect).toHaveBeenCalledWith(['a', 'b', 'c'], true);
	});

	it('shows a group with some of its entries selected as partly selected, and unselects them all', () => {
		const { onSelect } = renderRow({ selectedIds: ['a'] });
		const checkbox = screen.getByRole('checkbox', {
			name: 'dashboard.timesheets.SIMILAR.SELECT_GROUP(count=3,task=Fix the login page)'
		});

		expect(checkbox.getAttribute('aria-checked')).toBe('mixed');
		fireEvent.click(checkbox);

		expect(onSelect).toHaveBeenCalledWith(['a', 'b', 'c'], expect.any(Boolean));
	});

	it('shows a group with all its entries selected as selected', () => {
		renderRow({ selectedIds: ['a', 'b', 'c'] });

		const row = screen.getAllByRole('row')[0];
		expect(row.getAttribute('aria-selected')).toBe('true');
	});
});
