/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import type { TimesheetGroupChangeState } from '@/core/hooks/dashboards/timesheets/use-timesheet-group-change';
import type { TimesheetEntryGroup } from '@/core/lib/utils/dashboards/timesheet-entry-groups';
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

import { TimesheetsGroupChangeDialog } from './timesheets-group-change-dialog';

const LOGS: ITimeLog[] = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({
	id,
	duration: 3600,
	version: '1',
	task: { id: 'fix-login', title: 'Fix the login page' } as ITimeLog['task']
}));

const GROUP: TimesheetEntryGroup = {
	key: 'day|work',
	logs: LOGS,
	firstStart: null,
	lastEnd: null,
	isRunning: false,
	totalSeconds: 0
};

function stateOf(overrides: Partial<TimesheetGroupChangeState>): TimesheetGroupChangeState {
	return {
		handlers: { setBillable: jest.fn(), changeStatus: jest.fn(), remove: jest.fn() },
		change: null,
		isOpen: true,
		isSaving: false,
		confirm: jest.fn().mockResolvedValue(undefined),
		close: jest.fn(),
		...overrides
	};
}

describe('TimesheetsGroupChangeDialog', () => {
	it('asks before marking the entries of a group not billable, with their number and their task', () => {
		const state = stateOf({ change: { kind: 'billable', group: GROUP, isBillable: false } });
		render(<TimesheetsGroupChangeDialog state={state} />);

		expect(screen.getByText('dashboard.timesheets.SIMILAR.CONFIRM_NOT_BILLABLE(count=6)')).toBeTruthy();
		expect(screen.getByText('dashboard.timesheets.SIMILAR.CONFIRM_SCOPE(task=Fix the login page)')).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: 'common.CONFIRM' }));

		expect(state.confirm).toHaveBeenCalledTimes(1);
	});

	it('names the status the entries of a group take, and that whole timesheets change', () => {
		const state = stateOf({ change: { kind: 'status', group: GROUP, status: ETimesheetStatus.APPROVED } });
		render(<TimesheetsGroupChangeDialog state={state} />);

		expect(
			screen.getByText(
				'dashboard.timesheets.SIMILAR.CONFIRM_STATUS(count=6,status=dashboard.timesheets.STATUS.APPROVED)'
			)
		).toBeTruthy();
		expect(screen.getByText('dashboard.timesheets.SHEET.WHOLE_TIMESHEETS')).toBeTruthy();
	});

	it('keeps its confirmation from being sent twice while the entries are written', () => {
		const state = stateOf({ change: { kind: 'billable', group: GROUP, isBillable: true }, isSaving: true });
		render(<TimesheetsGroupChangeDialog state={state} />);

		const confirm = screen.getByRole('button', { name: 'common.CONFIRM' }) as HTMLButtonElement;
		expect(confirm.disabled).toBe(true);
	});

	it('draws nothing before a change is asked', () => {
		const { container } = render(<TimesheetsGroupChangeDialog state={stateOf({ change: null })} />);

		expect(container.innerHTML).toBe('');
	});
});
