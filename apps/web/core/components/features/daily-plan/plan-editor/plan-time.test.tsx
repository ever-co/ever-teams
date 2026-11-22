/** @jest-environment jsdom */
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { PlanHoursStepper } from './plan-time';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('sonner', () => ({ toast: { warning: jest.fn() } }));

/** The stepper as the plan editor holds it: the plan's hours live outside, and every change comes back in. */
function renderStepper(initialHours: number) {
	const saved = { hours: initialHours };
	function Editor() {
		const [hours, setHours] = useState(initialHours);
		const keep = (next: number) => {
			saved.hours = next;
			setHours(next);
		};
		return <PlanHoursStepper hours={hours} canEdit onChange={keep} />;
	}
	render(<Editor />);
	const field = screen.getByRole('textbox', { name: 'dailyPlan.PLANNED_TIME' }) as HTMLInputElement;
	return { field, saved };
}

function typeAndLeave(field: HTMLInputElement, text: string) {
	fireEvent.change(field, { target: { value: text } });
	fireEvent.blur(field);
}

describe('PlanHoursStepper (#5713)', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it.each([['2,5'], ['2.5'], ['2:30']])('plans two and a half hours when %p is typed', (typed) => {
		const { field, saved } = renderStepper(8);

		typeAndLeave(field, typed);

		expect(saved.hours).toBe(2.5);
		expect(field.value).toBe('2:30');
		expect(toast.warning).not.toHaveBeenCalled();
	});

	it('keeps what the person types while they type it', () => {
		const { field, saved } = renderStepper(8);

		fireEvent.change(field, { target: { value: '2,' } });

		expect(field.value).toBe('2,');
		expect(saved.hours).toBe(2);
	});

	it('refuses an entry it cannot read, and the plan keeps its hours', () => {
		const { field, saved } = renderStepper(8);

		typeAndLeave(field, 'two');

		expect(saved.hours).toBe(8);
		expect(field.value).toBe('8');
		expect(toast.warning).toHaveBeenCalledWith('toasts.plans.HOURS_INVALID', { id: 'plan-hours-invalid' });
	});

	it('moves an hour at a time from a part of an hour, never below no time', () => {
		const { field, saved } = renderStepper(0.5);

		fireEvent.click(screen.getByRole('button', { name: 'dailyPlan.editor.MORE_HOUR' }));
		expect(saved.hours).toBe(1.5);
		expect(field.value).toBe('1:30');

		fireEvent.click(screen.getByRole('button', { name: 'dailyPlan.editor.LESS_HOUR' }));
		fireEvent.click(screen.getByRole('button', { name: 'dailyPlan.editor.LESS_HOUR' }));
		expect(saved.hours).toBe(0);
	});
});
