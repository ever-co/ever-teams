/** @jest-environment jsdom */
import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { WorkspaceLocale } from '@/core/lib/utils/workspace-formats';
import { TimeField, type TimeFieldProps } from './time-field';

let mockLocale: WorkspaceLocale = { tag: 'en', dateFormat: null, numberFormat: null, clock: null };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string>) =>
		values ? `${key} ${JSON.stringify(values)}` : key
}));

jest.mock('@/core/hooks/common/use-workspace-locale', () => ({
	useWorkspaceLocale: () => mockLocale
}));

type HarnessProps = Omit<TimeFieldProps, 'value' | 'onChange'> & {
	initial?: string;
	onSend?: (value: string) => void;
	/** Whether the form takes a value it is sent, as a form that keeps its time when the field is cleared. */
	takes?: (value: string) => boolean;
};

function Harness({ initial = '', onSend, takes = () => true, ...props }: Readonly<HarnessProps>) {
	const [value, setValue] = useState(initial);
	return (
		<>
			<label htmlFor="start">Start</label>
			<TimeField
				id="start"
				value={value}
				onChange={(next) => {
					onSend?.(next);
					if (takes(next)) {
						setValue(next);
					}
				}}
				{...props}
			/>
			<output data-testid="value">{value}</output>
		</>
	);
}

function field() {
	return screen.getByLabelText('Start') as HTMLInputElement;
}

function valueSent() {
	return screen.getByTestId('value').textContent;
}

function openList() {
	fireEvent.click(screen.getByRole('button', { name: 'common.PICK_A_TIME' }));
	return screen.getByRole('listbox', { name: 'common.PICK_A_TIME' });
}

beforeEach(() => {
	mockLocale = { tag: 'en', dateFormat: null, numberFormat: null, clock: null };
});

describe('TimeField', () => {
	it("shows the time on the workspace's clock, labelled by its id", () => {
		const { unmount } = render(<Harness initial="21:05" />);
		expect(field().value).toBe('9:05 PM');
		unmount();

		mockLocale = { ...mockLocale, clock: 24 };
		render(<Harness initial="21:05" />);
		expect(field().value).toBe('21:05');
	});

	it('sends what is typed as soon as it reads as a time, and writes it again on leaving', () => {
		const onSend = jest.fn();
		render(<Harness initial="09:00" onSend={onSend} />);

		fireEvent.focus(field());
		fireEvent.change(field(), { target: { value: '930p' } });
		expect(onSend).toHaveBeenLastCalledWith('21:30');
		expect(field().value).toBe('930p');

		fireEvent.blur(field());
		expect(field().value).toBe('9:30 PM');
		expect(valueSent()).toBe('21:30');
	});

	it('puts the time back when what is typed reads as none', () => {
		const onSend = jest.fn();
		render(<Harness initial="09:00" onSend={onSend} />);

		fireEvent.focus(field());
		fireEvent.change(field(), { target: { value: 'soon' } });
		fireEvent.blur(field());

		expect(onSend).not.toHaveBeenCalled();
		expect(field().value).toBe('9:00 AM');
	});

	it('sends no time once the text is cleared, as the native field did', () => {
		render(<Harness initial="09:00" />);

		fireEvent.change(field(), { target: { value: '' } });

		expect(valueSent()).toBe('');
		expect(field().placeholder).toBe('9:00 AM');
	});

	it('shows the time its form keeps once left, when the form did not take the cleared text', () => {
		render(<Harness initial="09:00" takes={(value) => value !== ''} />);

		fireEvent.focus(field());
		fireEvent.change(field(), { target: { value: '' } });
		expect(field().value).toBe('');
		fireEvent.blur(field());

		expect(valueSent()).toBe('09:00');
		expect(field().value).toBe('9:00 AM');
	});

	it('picks a time in the list, which closes and gives the focus back to the field', async () => {
		render(<Harness initial="09:00" />);

		const list = openList();
		expect(within(list).getByRole('option', { name: '9:00 AM' }).getAttribute('aria-selected')).toBe('true');
		fireEvent.click(within(list).getByRole('option', { name: '10:15 AM' }));

		expect(valueSent()).toBe('10:15');
		expect(field().value).toBe('10:15 AM');
		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(field()));
	});

	it('lists every quarter of an hour, or the step the field asks for', () => {
		const { unmount } = render(<Harness />);
		expect(within(openList()).getAllByRole('option')).toHaveLength(96);
		unmount();

		render(<Harness step={30} />);
		expect(within(openList()).getAllByRole('option')).toHaveLength(48);
	});

	it('opens the list from the keyboard', () => {
		render(<Harness initial="09:00" />);

		fireEvent.keyDown(field(), { key: 'ArrowDown' });

		expect(screen.getByRole('listbox', { name: 'common.PICK_A_TIME' })).toBeTruthy();
	});

	it('keeps the times out of range from being picked, and refuses a typed one as the native field did', async () => {
		render(<Harness initial="08:00" min="09:00" max="17:00" />);

		const list = openList();
		expect((within(list).getByRole('option', { name: '8:45 AM' }) as HTMLButtonElement).disabled).toBe(true);
		expect((within(list).getByRole('option', { name: '9:00 AM' }) as HTMLButtonElement).disabled).toBe(false);
		expect((within(list).getByRole('option', { name: '5:15 PM' }) as HTMLButtonElement).disabled).toBe(true);
		expect(field().validationMessage).toBe('common.PICK_THIS_OR_LATER {"value":"9:00 AM"}');

		fireEvent.click(within(list).getByRole('option', { name: '9:30 AM' }));
		expect(field().validationMessage).toBe('');
		await waitFor(() => expect(document.activeElement).toBe(field()));
	});

	it('hands Enter to the form once the typed time is sent', () => {
		const onKeyDown = jest.fn();
		render(<Harness initial="09:00" onKeyDown={onKeyDown} />);

		fireEvent.change(field(), { target: { value: '14:45' } });
		fireEvent.keyDown(field(), { key: 'Enter' });

		expect(valueSent()).toBe('14:45');
		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(field().value).toBe('2:45 PM');
	});

	it('cannot be typed in or opened when disabled', () => {
		render(<Harness initial="09:00" disabled />);

		expect(field().disabled).toBe(true);
		expect((screen.getByRole('button', { name: 'common.PICK_A_TIME' }) as HTMLButtonElement).disabled).toBe(true);
	});
});
