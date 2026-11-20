import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { showMessage } from 'react-native-flash-message';
import { TaskDateField } from './task-date-field';
import { dayOfStoredDate, presetDayOf, shortDayOf, storedDateOf } from './task-date-rules';

jest.mock('../../../../theme', () => ({
	...jest.requireActual('../../../../theme/typography'),
	useWebTheme: () => jest.requireActual('../../../../../src/theme/use-theme').themeFor('light')
}));
jest.mock('../../../../../src/components/icons', () =>
	jest.requireActual('../../../../../test/icons-stand-in').iconsStandIn()
);
jest.mock('../../../../../src/components/menu-anchor', () =>
	jest.requireActual('../../../../../test/menu-anchor-stand-in').menuAnchorStandIn()
);
jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));
// The calendar as one button that picks the first of December, so a test can pick a day in it
jest.mock('react-native-calendars', () => {
	const { createElement } = jest.requireActual('react');
	const { Pressable } = jest.requireActual('react-native');
	return {
		Calendar: ({ onDayPress }: { onDayPress: (day: { dateString: string }) => void }) =>
			createElement(Pressable, { testID: 'calendar', onPress: () => onDayPress({ dateString: '2026-12-01' }) })
	};
});

const friday = storedDateOf(new Date(2026, 10, 20));

function drawField(props: Partial<React.ComponentProps<typeof TaskDateField>>) {
	const onChange = jest.fn();
	const drawing = render(<TaskDateField kind="start" value={null} otherDate={null} onChange={onChange} {...props} />);
	return { drawing, onChange };
}

describe("a task's date on the task page", () => {
	it('offers to add a date while it has none, and opens the quick picks and the calendar', async () => {
		const { drawing } = drawField({});
		await drawing;

		await fireEvent.press(screen.getByText('taskMenus.dates.addDate undefined'));

		expect(screen.getByText('taskMenus.dates.today undefined')).toBeTruthy();
		expect(screen.getByText('taskMenus.dates.endOfWeek undefined')).toBeTruthy();
		expect(screen.getByTestId('calendar')).toBeTruthy();
		expect(screen.queryByText('taskMenus.dates.clear undefined')).toBeNull();
	});

	it('sends the day of a quick pick, or of the calendar, as the task page always sent a date', async () => {
		const { drawing, onChange } = drawField({});
		await drawing;

		await fireEvent.press(screen.getByText('taskMenus.dates.addDate undefined'));
		await fireEvent.press(screen.getByText('taskMenus.dates.tomorrow undefined'));
		expect(onChange).toHaveBeenLastCalledWith(storedDateOf(presetDayOf('tomorrow')));

		await fireEvent.press(screen.getByText('taskMenus.dates.addDate undefined'));
		await fireEvent.press(screen.getByTestId('calendar'));
		expect(onChange).toHaveBeenLastCalledWith(storedDateOf(new Date(2026, 11, 1)));
	});

	it('reads a set date as the web does, and clears it', async () => {
		const { drawing, onChange } = drawField({ value: friday });
		await drawing;

		const shown = shortDayOf(dayOfStoredDate(friday) as Date, 'en');
		await fireEvent.press(screen.getByText(shown));
		await fireEvent.press(screen.getByText('taskMenus.dates.clear undefined'));

		expect(onChange).toHaveBeenCalledWith(null);
	});

	it('refuses a start after the due day, with the reason', async () => {
		const { drawing, onChange } = drawField({ kind: 'start', otherDate: friday });
		await drawing;

		await fireEvent.press(screen.getByText('taskMenus.dates.addDate undefined'));
		await fireEvent.press(screen.getByTestId('calendar'));

		expect(onChange).not.toHaveBeenCalled();
		expect(showMessage).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'taskMenus.dates.startAfterDue undefined', type: 'warning' })
		);
	});
});
