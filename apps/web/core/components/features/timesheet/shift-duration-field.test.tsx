/** @jest-environment jsdom */

import { render } from '@testing-library/react';
import type { DurationEntryInput } from '@/core/hooks/timesheet/use-duration-entry';
import { ShiftDurationField, type ShiftTimes } from './shift-duration-field';

const mockEntry: { input?: DurationEntryInput; blocksSave: boolean } = { blocksSave: false };

// The field's own work is what it hands the duration entry: the entry has its own tests
jest.mock('@/core/hooks/timesheet/use-duration-entry', () => ({
	useDurationEntry: (input: DurationEntryInput) => {
		mockEntry.input = input;
		return {
			text: '',
			phase: { kind: 'idle' },
			change: jest.fn(),
			commit: jest.fn(),
			retry: jest.fn(),
			blocksSave: mockEntry.blocksSave
		};
	}
}));
jest.mock('@/core/components/features/manual-time/duration-field', () => ({ DurationField: () => null }));

const DAY = new Date(2026, 10, 10);

/** Minutes since midnight of an option such as `01:30:00 PM`, as the time entry dialog reads its own. */
function minutesOfOption(option: string) {
	const [clock, period] = option.split(' ');
	const [hours, minutes] = clock.split(':').map(Number);
	const hourOfPeriod = hours % 12;
	let total = hourOfPeriod * 60 + minutes;
	if (period === 'PM') {
		total += 720;
	}
	return total;
}

function shiftOf(startTime: string, endTime: string): ShiftTimes {
	return { dateFrom: DAY, startTime, endTime };
}

function entryInput(): DurationEntryInput {
	const input = mockEntry.input;
	if (!input) {
		throw new Error('The field did not ask for a duration entry');
	}
	return input;
}

describe('ShiftDurationField', () => {
	afterEach(() => {
		mockEntry.blocksSave = false;
	});

	function renderField(shift: ShiftTimes, onSaveBlock: (index: number, blocksSave: boolean) => void) {
		return render(
			<ShiftDurationField
				shift={shift}
				readShifts={() => [shift]}
				index={0}
				employeeId="employee-a"
				minutesOfOption={minutesOfOption}
				onTimes={jest.fn()}
				onSaveBlock={onSaveBlock}
			/>
		);
	}

	it('tells the dialog its period may not be saved while the field refuses its text', () => {
		mockEntry.blocksSave = true;
		const onSaveBlock = jest.fn();

		renderField(shiftOf('09:00:00 AM', '10:00:00 AM'), onSaveBlock);

		expect(onSaveBlock).toHaveBeenCalledWith(0, true);
	});

	it('lifts a block its period still carries once the field no longer refuses anything', () => {
		const onSaveBlock = jest.fn();

		renderField({ ...shiftOf('09:00:00 AM', '10:00:00 AM'), blocksSave: true }, onSaveBlock);

		expect(onSaveBlock).toHaveBeenCalledWith(0, false);
	});

	it('says nothing while the period already holds the answer of the field', () => {
		const onSaveBlock = jest.fn();

		renderField(shiftOf('09:00:00 AM', '10:00:00 AM'), onSaveBlock);

		expect(onSaveBlock).not.toHaveBeenCalled();
	});

	it('keeps a proposal away from the times the other periods hold at the moment it is placed', () => {
		const emptyShift = shiftOf('', '');
		let latestShifts = [emptyShift, emptyShift];
		render(
			<ShiftDurationField
				shift={emptyShift}
				readShifts={() => latestShifts}
				index={1}
				employeeId="employee-a"
				minutesOfOption={minutesOfOption}
				onTimes={jest.fn()}
				onSaveBlock={jest.fn()}
			/>
		);

		expect(entryInput().readClaimed?.()).toEqual([]);

		// The first period receives its times after this one was rendered, and the dialog has not rendered again
		latestShifts = [shiftOf('09:00:00 AM', '10:30:00 AM'), emptyShift];

		const morning = { start: new Date(2026, 10, 10, 9), end: new Date(2026, 10, 10, 10, 30) };
		expect(entryInput().readClaimed?.()).toEqual([morning]);
	});
});
