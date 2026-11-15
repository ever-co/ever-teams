/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { WorkingDay } from '@/core/lib/utils/settings-working-hours';
import { WorkingDayRow } from './working-day-row';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key,
	useLocale: () => 'en'
}));

// A workspace on a 24-hour clock, so the fields read as the values they hold
jest.mock('@/core/hooks/common/use-workspace-locale', () => ({
	useWorkspaceLocale: () => ({ tag: 'en', dateFormat: null, numberFormat: null, clock: 24 })
}));

const MONDAY: WorkingDay = { day: 'monday', isWorking: true, slots: [{ id: 'slot-1', start: '09:00', end: '17:00' }] };

function renderRow() {
	const onSlotChange = jest.fn();
	render(
		<WorkingDayRow
			day={MONDAY}
			dayLabel="Monday"
			onWorkingChange={jest.fn()}
			onSlotChange={onSlotChange}
			onSlotAdd={jest.fn()}
			onSlotRemove={jest.fn()}
		/>
	);
	return onSlotChange;
}

function slotField(edge: 'START_OF' | 'END_OF') {
	return screen.getByLabelText(
		`settings.workingHours.${edge} ${JSON.stringify({ day: 'Monday', position: 1 })}`
	) as HTMLInputElement;
}

describe('WorkingDayRow', () => {
	it("shows a slot's start and end in the app time fields", () => {
		renderRow();

		expect(slotField('START_OF').value).toBe('09:00');
		expect(slotField('END_OF').value).toBe('17:00');
	});

	it('changes the end of a slot to a typed time', () => {
		const onSlotChange = renderRow();

		fireEvent.focus(slotField('END_OF'));
		fireEvent.change(slotField('END_OF'), { target: { value: '18:30' } });

		expect(onSlotChange).toHaveBeenCalledWith('monday', 'slot-1', 'end', '18:30');
	});

	it('changes the start of a slot to a time picked in the list', async () => {
		const onSlotChange = renderRow();

		fireEvent.click(screen.getAllByRole('button', { name: 'common.PICK_A_TIME' })[0]);
		fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '08:30' }));

		expect(onSlotChange).toHaveBeenCalledWith('monday', 'slot-1', 'start', '08:30');
		await waitFor(() => expect(document.activeElement).toBe(slotField('START_OF')));
	});

	it('keeps the slot as it was when its start is cleared, and shows it again once left', () => {
		const onSlotChange = renderRow();

		fireEvent.focus(slotField('START_OF'));
		fireEvent.change(slotField('START_OF'), { target: { value: '' } });
		fireEvent.blur(slotField('START_OF'));

		expect(onSlotChange).not.toHaveBeenCalled();
		expect(slotField('START_OF').value).toBe('09:00');
	});
});
