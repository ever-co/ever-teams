/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QuietHoursRow } from './notification-channel-rows';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => 'en'
}));

// A workspace on a 24-hour clock, so the fields read as the values they hold
jest.mock('@/core/hooks/common/use-workspace-locale', () => ({
	useWorkspaceLocale: () => ({ tag: 'en', dateFormat: null, numberFormat: null, clock: 24 })
}));

const WINDOW = { start: '22:00', end: '07:00', timeZone: 'Europe/Paris' };

function renderRow() {
	const onChange = jest.fn();
	render(<QuietHoursRow window={WINDOW} onChange={onChange} />);
	return onChange;
}

function fromField() {
	return screen.getByLabelText('notifications.SETTINGS_PAGE.CHANNELS.QUIET_FROM') as HTMLInputElement;
}

describe('QuietHoursRow', () => {
	it('shows the saved window in the app time fields', () => {
		renderRow();

		expect(fromField().value).toBe('22:00');
		expect((screen.getByLabelText('notifications.SETTINGS_PAGE.CHANNELS.QUIET_TO') as HTMLInputElement).value).toBe(
			'07:00'
		);
	});

	it('saves a typed start once the field is left', () => {
		const onChange = renderRow();

		fireEvent.focus(fromField());
		fireEvent.change(fromField(), { target: { value: '23:15' } });
		expect(onChange).not.toHaveBeenCalled();
		fireEvent.blur(fromField());

		expect(onChange).toHaveBeenCalledWith({ start: '23:15', end: '07:00', timeZone: 'Europe/Paris' });
	});

	it('saves a start picked in the list once the field is left', async () => {
		const onChange = renderRow();

		fireEvent.click(screen.getAllByRole('button', { name: 'common.PICK_A_TIME' })[0]);
		fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '23:30' }));
		expect(fromField().value).toBe('23:30');
		// The pick gives the focus back to the field, which saves when it is left
		await waitFor(() => expect(document.activeElement).toBe(fromField()));
		expect(onChange).not.toHaveBeenCalled();
		fireEvent.blur(fromField());

		expect(onChange).toHaveBeenCalledWith({ start: '23:30', end: '07:00', timeZone: 'Europe/Paris' });
	});

	it('puts the saved time back when the start is cleared, as before', () => {
		const onChange = renderRow();

		fireEvent.focus(fromField());
		fireEvent.change(fromField(), { target: { value: '' } });
		fireEvent.blur(fromField());

		expect(fromField().value).toBe('22:00');
		expect(onChange).not.toHaveBeenCalled();
	});
});
