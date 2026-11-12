/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';

import { TimerBillableToggle } from './timer-billable-toggle';

const mockSetIsBillable = jest.fn();
let mockBillable = { isBillable: false, isLocked: false };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/hooks/timer/use-timer-billable', () => ({
	useTimerBillable: () => ({ ...mockBillable, setIsBillable: mockSetIsBillable })
}));

function billableToggle() {
	return screen.getByRole<HTMLButtonElement>('button', { name: 'timer.BILLABLE' });
}

describe('TimerBillableToggle', () => {
	beforeEach(() => {
		mockBillable = { isBillable: false, isLocked: false };
	});

	it('rests without its shine while the entry is not billable', () => {
		render(<TimerBillableToggle />);

		expect(billableToggle().getAttribute('aria-pressed')).toBe('false');
		expect(billableToggle().querySelector('[data-shine-border]')).toBeNull();
	});

	it('wears the shine ring while the entry is billable', () => {
		mockBillable = { isBillable: true, isLocked: false };
		render(<TimerBillableToggle />);

		expect(billableToggle().getAttribute('aria-pressed')).toBe('true');
		expect(billableToggle().querySelector('[data-shine-border]')).not.toBeNull();
	});

	it('flips billable on a click', () => {
		render(<TimerBillableToggle />);

		fireEvent.click(billableToggle());

		expect(mockSetIsBillable).toHaveBeenCalledWith(true);
	});

	it('is locked while the timer runs, and keeps showing a billable entry', () => {
		mockBillable = { isBillable: true, isLocked: false };
		render(<TimerBillableToggle locked />);

		expect(billableToggle().disabled).toBe(true);
		expect(billableToggle().querySelector('[data-shine-border]')).not.toBeNull();
	});
});
