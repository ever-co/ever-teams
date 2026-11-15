/** @jest-environment jsdom */
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { WorkspaceLocale } from '@/core/lib/utils/workspace-formats';
import { DateField, type DateFieldProps } from './date-field';

let mockLocale: WorkspaceLocale = { tag: 'en', dateFormat: null, numberFormat: null, clock: null };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string>) =>
		values ? `${key} ${JSON.stringify(values)}` : key
}));

jest.mock('@/core/hooks/common/use-workspace-locale', () => ({
	useWorkspaceLocale: () => mockLocale
}));

jest.mock('@/core/hooks/common/use-workspace-week-start', () => ({
	useWorkspaceWeekStart: () => 1
}));

type HarnessProps = Omit<DateFieldProps, 'value' | 'onChange'> & {
	initial?: string;
	onSend?: (value: string) => void;
};

function Harness({ initial = '', onSend, ...props }: Readonly<HarnessProps>) {
	const [value, setValue] = useState(initial);
	return (
		<>
			<label htmlFor="issue">Issue date</label>
			<DateField
				id="issue"
				value={value}
				onChange={(next) => {
					onSend?.(next);
					setValue(next);
				}}
				{...props}
			/>
			<output data-testid="value">{value}</output>
		</>
	);
}

function field() {
	return screen.getByLabelText('Issue date') as HTMLInputElement;
}

function valueSent() {
	return screen.getByTestId('value').textContent;
}

function openCalendar() {
	fireEvent.click(screen.getByRole('button', { name: 'common.PICK_A_DATE' }));
}

beforeEach(() => {
	mockLocale = { tag: 'en', dateFormat: null, numberFormat: null, clock: null };
});

describe('DateField', () => {
	it("shows the day in the workspace's date format, labelled by its id", () => {
		const { unmount } = render(<Harness initial="2026-12-31" />);
		expect(field().value).toBe('12/31/2026');
		unmount();

		mockLocale = { ...mockLocale, dateFormat: 'DD.MM.YYYY' };
		render(<Harness initial="2026-12-31" />);
		expect(field().value).toBe('31.12.2026');
	});

	it('sends a typed day as soon as it reads as one, in the order the field writes it or year first', () => {
		const onSend = jest.fn();
		render(<Harness initial="2026-11-03" onSend={onSend} />);

		fireEvent.focus(field());
		fireEvent.change(field(), { target: { value: '1/15/203' } });
		expect(onSend).not.toHaveBeenCalled();
		fireEvent.change(field(), { target: { value: '1/15/2030' } });
		expect(onSend).toHaveBeenLastCalledWith('2030-01-15');
		fireEvent.change(field(), { target: { value: '2030-02-01' } });
		expect(onSend).toHaveBeenLastCalledWith('2030-02-01');

		fireEvent.blur(field());
		expect(field().value).toBe('02/01/2030');
	});

	it('puts the day back when what is typed reads as none', () => {
		render(<Harness initial="2026-11-03" />);

		fireEvent.focus(field());
		fireEvent.change(field(), { target: { value: '2/30/2026' } });
		fireEvent.blur(field());

		expect(valueSent()).toBe('2026-11-03');
		expect(field().value).toBe('11/03/2026');
	});

	it("picks a day on the app's calendar, opened at the month of the field", async () => {
		render(<Harness initial="2026-11-03" />);

		openCalendar();
		fireEvent.click(await screen.findByRole('gridcell', { name: '15' }));

		expect(valueSent()).toBe('2026-11-15');
		expect(field().value).toBe('11/15/2026');
		await waitFor(() => expect(screen.queryByRole('gridcell', { name: '15' })).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(field()));
	});

	it('keeps the days out of range from being picked, and refuses a typed one as the native field did', async () => {
		render(<Harness initial="2026-11-20" min="2026-11-10" max="2026-11-18" />);

		openCalendar();
		expect((await screen.findByRole('gridcell', { name: '9' })).hasAttribute('disabled')).toBe(true);
		expect(screen.getByRole('gridcell', { name: '12' }).hasAttribute('disabled')).toBe(false);
		expect(screen.getByRole('gridcell', { name: '19' }).hasAttribute('disabled')).toBe(true);
		expect(field().validationMessage).toBe('common.PICK_THIS_OR_EARLIER {"value":"11/18/2026"}');

		fireEvent.click(screen.getByRole('gridcell', { name: '12' }));
		expect(valueSent()).toBe('2026-11-12');
		expect(field().validationMessage).toBe('');
		await waitFor(() => expect(document.activeElement).toBe(field()));
	});

	it('opens the calendar from the keyboard', async () => {
		render(<Harness initial="2026-11-03" />);

		fireEvent.keyDown(field(), { key: 'ArrowDown' });

		expect(await screen.findByRole('gridcell', { name: '15' })).toBeTruthy();
	});
});
