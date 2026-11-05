/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { AuthState } from './auth-state';

jest.mock('@/core/components/common/toast-orb', () => ({
	ToastOrb: () => <span />
}));

describe('AuthState', () => {
	it.each(['error', 'warning'] as const)('announces a %s state at once', (tone) => {
		render(<AuthState tone={tone} title="The link expired" />);

		const state = screen.getByRole('alert');
		expect(state.getAttribute('aria-live')).toBe('assertive');
	});

	it('lets a success state wait for the current speech', () => {
		render(<AuthState tone="success" title="Check your inbox" />);

		const state = screen.getByRole('status');
		expect(state.getAttribute('aria-live')).toBe('polite');
	});
});
