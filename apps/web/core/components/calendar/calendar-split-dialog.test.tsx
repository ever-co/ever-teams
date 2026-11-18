/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CalendarEntry } from '@/core/lib/utils/calendar-view';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

/** The split's state as the hook gives it: `failure` is what the last try ended with. */
const mockSplit = {
	failure: null as string | null,
	isSaving: false,
	save: jest.fn(async () => false),
	reset: jest.fn()
};
jest.mock('@/core/hooks/calendar/use-calendar-entry-split', () => ({
	useCalendarEntrySplit: () => mockSplit
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { tenantId: 'tenant' } })
}));
jest.mock('@/core/hooks/common/use-workspace-locale', () => ({
	useWorkspaceLocale: () => 'en'
}));
jest.mock('@/core/stores/teams/team-tasks', () => ({ tasksByTeamState: {} }));
jest.mock('jotai', () => ({ ...jest.requireActual('jotai'), useAtomValue: () => [] }));
jest.mock('@/core/components/tasks/detail/task-picker-menu', () => ({
	TaskPickerMenu: ({ disabled, children }: { disabled?: boolean; children: ReactNode }) => (
		<button type="button" disabled={disabled} data-testid="task-picker">
			{children}
		</button>
	)
}));

import { CalendarSplitDialog } from './calendar-split-dialog';

/** 2026-11-09 at `HH:mm`, local time. */
const at = (time: string) => {
	const [hours, minutes] = time.split(':').map(Number);
	return new Date(2026, 10, 9, hours, minutes);
};

/** Marie's tracked entry from 10:20 to 11:40, on her own task. */
function trackedEntry(): CalendarEntry {
	const log = {
		id: 'tracked',
		startedAt: at('10:20').toISOString(),
		stoppedAt: at('11:40').toISOString(),
		logType: 'TRACKED',
		isRunning: false,
		taskId: 'homepage'
	} as unknown as ITimeLog;
	return {
		id: 'tracked',
		log,
		start: at('10:20'),
		end: at('11:40'),
		dayKey: '2026-11-09',
		durationSeconds: 80 * 60,
		daySeconds: 80 * 60,
		isManual: false,
		isBreak: false,
		isRunning: false,
		isBillable: true,
		taskTitle: 'Homepage redesign',
		projectKey: null,
		projectName: null,
		projectColor: null,
		reason: null
	};
}

const clock = (date: Date) =>
	`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const formatters = {
	time: clock,
	dayDate: () => 'Nov 9',
	weekday: () => 'Monday',
	weekdayShort: () => 'Mon',
	monthTitle: () => 'November',
	dayNumber: () => '9'
} as TimesheetFormatters;

function renderDialog(props: Partial<Parameters<typeof CalendarSplitDialog>[0]> = {}) {
	return render(
		<CalendarSplitDialog
			entry={trackedEntry()}
			isOpen
			refusal="none"
			viaApi
			formatters={formatters}
			onClose={jest.fn()}
			onAddTime={jest.fn()}
			{...props}
		/>
	);
}

describe('CalendarSplitDialog (#5369)', () => {
	beforeEach(() => {
		mockSplit.failure = null;
		mockSplit.isSaving = false;
		mockSplit.save.mockClear();
	});

	it('offers to ask the API again after a check that failed, instead of refusing tracked time', () => {
		const onRecheck = jest.fn();
		// What the menu works out while the API has not said it splits: tracked time is not split in two writes
		renderDialog({ refusal: 'tracked', viaApi: false, checkFailed: true, onRecheck });

		expect(screen.getByText('dashboard.calendar.SPLIT.CHECK_FAILED')).toBeTruthy();
		expect(screen.queryByText('dashboard.calendar.SPLIT.REFUSED.TRACKED')).toBeNull();
		expect(screen.queryByRole('button', { name: 'dashboard.calendar.SPLIT.ACTION' })).toBeNull();

		fireEvent.click(screen.getByRole('button', { name: 'dashboard.calendar.SPLIT.CHECK_AGAIN' }));

		expect(onRecheck).toHaveBeenCalledTimes(1);
	});

	it('keeps the time and the task as sent after an unknown outcome, so the next try repeats that split', async () => {
		mockSplit.failure = 'retry';
		renderDialog();

		expect(screen.getByText('dashboard.calendar.SPLIT.FAILED_RETRY')).toBeTruthy();
		expect((screen.getByLabelText('dashboard.calendar.SPLIT.TIME_LABEL') as HTMLInputElement).disabled).toBe(true);
		expect((screen.getByRole('button', { name: /Homepage redesign/ }) as HTMLButtonElement).disabled).toBe(true);

		const action = screen.getByRole('button', { name: 'dashboard.calendar.SPLIT.ACTION' }) as HTMLButtonElement;
		expect(action.disabled).toBe(false);
		fireEvent.click(action);

		expect(mockSplit.save).toHaveBeenCalledWith(
			expect.objectContaining({ splitAt: at('11:00'), secondTask: null })
		);
	});

	it('offers no task for the second part of a break, which stays a break', () => {
		const { unmount } = renderDialog();
		expect(screen.getByTestId('task-picker')).toBeTruthy();
		unmount();

		renderDialog({ entry: { ...trackedEntry(), isBreak: true } });

		expect(screen.queryByTestId('task-picker')).toBeNull();
	});

	it('leaves the fields open after a refusal the person can fix, such as a missing reason', () => {
		mockSplit.failure = 'reason-required';
		renderDialog();

		expect((screen.getByLabelText('dashboard.calendar.SPLIT.TIME_LABEL') as HTMLInputElement).disabled).toBe(false);
		expect((screen.getByLabelText('dashboard.calendar.SPLIT.REASON_LABEL') as HTMLInputElement).disabled).toBe(
			false
		);
	});
});
