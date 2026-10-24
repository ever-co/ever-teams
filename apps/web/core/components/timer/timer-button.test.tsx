/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { TimerButton } from './timer-button';

jest.mock('assets/svg', () => ({ TimerPlayIcon: () => null, TimerStopIcon: () => null }), { virtual: true });
jest.mock('@/core/lib/utils', () => ({ clsxm: (...values: string[]) => values.filter(Boolean).join(' ') }));
jest.mock('@/core/components', () => ({
	Button: ({ children, ...props }: React.ComponentProps<'button'>) => <button {...props}>{children}</button>
}));

describe('TimerButton browser contract', () => {
	it('exposes the start action to keyboard/browser tests', () => {
		render(<TimerButton running={false} disabled={false} />);
		expect(screen.getByRole('button', { name: 'Start timer' })).toBeTruthy();
	});

	it('exposes the stop action without changing disabled policy behavior', () => {
		render(<TimerButton running disabled />);
		const button = screen.getByRole('button', { name: 'Stop timer' });
		expect(button.getAttribute('aria-disabled')).toBe('true');
		expect(button.hasAttribute('disabled')).toBe(false);
	});
});
