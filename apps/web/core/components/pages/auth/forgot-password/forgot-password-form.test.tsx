/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ForgotPasswordForm from './forgot-password-form';

const mockRequestPassword = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('@/core/components/layouts/default-layout/auth-layout', () => ({
	AuthLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));
jest.mock('@/core/services/client/api/auth/auth.service', () => ({
	authService: { requestPassword: (...args: unknown[]) => mockRequestPassword(...args) }
}));

beforeEach(() => {
	window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
});

function emailField() {
	return screen.getByLabelText('auth.field.EMAIL_LABEL');
}

async function submit() {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'auth.forgot.SUBMIT' }));
	});
}

describe('ForgotPasswordForm', () => {
	it('asks for a valid address before sending anything', async () => {
		render(<ForgotPasswordForm />);
		fireEvent.change(emailField(), { target: { value: 'alice.example.com' } });

		await submit();

		expect(screen.getByRole('alert').textContent).toBe('auth.field.EMAIL_INVALID');
		expect(mockRequestPassword).not.toHaveBeenCalled();
	});

	it('clears the error once the address is edited', async () => {
		render(<ForgotPasswordForm />);
		await submit();
		expect(screen.getByRole('alert').textContent).toBe('form.EMAIL_REQUIRED');

		fireEvent.change(emailField(), { target: { value: 'a' } });

		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('sends the reset link to a valid address', async () => {
		mockRequestPassword.mockResolvedValue(undefined);
		render(<ForgotPasswordForm />);
		fireEvent.change(emailField(), { target: { value: ' alice@example.com ' } });

		await submit();

		expect(mockRequestPassword).toHaveBeenCalledWith('alice@example.com');
	});
});
