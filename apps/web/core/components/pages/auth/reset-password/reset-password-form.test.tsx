/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ResetPasswordForm from './reset-password-form';

const mockResetPassword = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('next/navigation', () => ({
	useSearchParams: () => new URLSearchParams('token=reset-token')
}));
jest.mock('@/core/components/layouts/default-layout/auth-layout', () => ({
	AuthLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));
jest.mock('@/core/services/client/api/auth/auth.service', () => ({
	authService: { resetPassword: (...args: unknown[]) => mockResetPassword(...args) }
}));

beforeEach(() => {
	window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
	mockResetPassword.mockResolvedValue(true);
});

function typePasswords(password: string) {
	fireEvent.change(screen.getByLabelText('auth.reset.NEW_LABEL'), { target: { value: password } });
	fireEvent.change(screen.getByLabelText('auth.reset.CONFIRM_LABEL'), { target: { value: password } });
}

async function submit() {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'auth.reset.SUBMIT' }));
	});
}

describe('ResetPasswordForm', () => {
	it.each([
		['abcdef1!', 'auth.password.RULE_UPPERCASE'],
		['ABCDEF1!', 'auth.password.RULE_LOWERCASE'],
		['Abcdefg!', 'auth.password.RULE_DIGIT'],
		['Abcdefg1', 'auth.password.RULE_SYMBOL'],
		['Ab1!', 'auth.password.RULE_MIN_LENGTH']
	])('keeps %p from being sent and names the missing rule', async (password, missingRule) => {
		render(<ResetPasswordForm isTokenExpired={false} />);
		typePasswords(password);

		await submit();

		expect(screen.getByRole('alert').textContent).toBe(missingRule);
		expect(mockResetPassword).not.toHaveBeenCalled();
	});

	it('names the first missing rule, in the order the list shows them', async () => {
		render(<ResetPasswordForm isTokenExpired={false} />);
		typePasswords('abcdefgh');

		await submit();

		expect(screen.getByRole('alert').textContent).toBe('auth.password.RULE_UPPERCASE');
		expect(mockResetPassword).not.toHaveBeenCalled();
	});

	it('sends a password that meets every rule', async () => {
		render(<ResetPasswordForm isTokenExpired={false} />);
		typePasswords('Abcdef1!');

		await submit();

		expect(mockResetPassword).toHaveBeenCalledWith('reset-token', 'Abcdef1!', 'Abcdef1!');
	});
});
