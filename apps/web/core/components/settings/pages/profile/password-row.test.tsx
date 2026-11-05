/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

const mockSavePassword = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	}
}));
jest.mock('next/link', () => ({
	__esModule: true,
	default: ({ href, children }: { href: string; children?: React.ReactNode }) => <a href={href}>{children}</a>
}));
jest.mock('@/core/components/icons', () => ({ Check: () => null, Spinner: () => null }));
jest.mock('@/core/hooks/settings/use-account-password', () => ({
	useAccountPassword: () => ({ savePassword: mockSavePassword, isSavingPassword: false })
}));

import { PasswordRow } from './password-row';

function openForm() {
	render(<PasswordRow />);
	fireEvent.click(screen.getByText('settings.profile.PASSWORD_SET'));
}

function fill(password: string, confirmation: string) {
	fireEvent.change(screen.getByLabelText('settings.profile.PASSWORD_NEW'), { target: { value: password } });
	fireEvent.change(screen.getByLabelText('settings.profile.PASSWORD_CONFIRM'), { target: { value: confirmation } });
}

async function submit() {
	await act(async () => {
		fireEvent.click(screen.getByText('settings.profile.PASSWORD_SAVE'));
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
}

describe('PasswordRow', () => {
	beforeEach(() => mockSavePassword.mockReset());

	it("says it sets this workspace's password only and points to Forgot password for the others", () => {
		render(<PasswordRow />);

		expect(screen.getByText(/settings\.profile\.PASSWORD_DESCRIPTION/)).toBeTruthy();
		const link = screen.getByRole('link', { name: 'settings.profile.PASSWORD_OTHER_WORKSPACES' });
		expect(link.getAttribute('href')).toBe('/auth/forgot-password');
	});

	it("refuses a password shorter than Gauzy's 8 characters without saving it", async () => {
		openForm();
		fill('1234567', '1234567');

		await submit();

		expect(screen.getByRole('alert').textContent).toContain('auth.password.RULE_MIN_LENGTH');
		expect(mockSavePassword).not.toHaveBeenCalled();
	});

	it('refuses a confirmation that differs without saving it', async () => {
		openForm();
		fill('12345678', '12345679');

		await submit();

		expect(screen.getByRole('alert').textContent).toBe('errors.PASSWORDS_DO_NOT_MATCH');
		expect(mockSavePassword).not.toHaveBeenCalled();
	});

	it('saves a valid password, closes the form and says so', async () => {
		mockSavePassword.mockResolvedValue(undefined);
		openForm();
		fill('12345678', '12345678');

		await submit();

		expect(mockSavePassword).toHaveBeenCalledWith('12345678');
		expect(screen.queryByLabelText('settings.profile.PASSWORD_NEW')).toBeNull();
		expect(screen.getByText('settings.profile.PASSWORD_SAVED')).toBeTruthy();
	});

	it('keeps the form open with the reason when Gauzy refuses', async () => {
		mockSavePassword.mockRejectedValue({ response: { status: 403 } });
		openForm();
		fill('12345678', '12345678');

		await submit();

		expect(screen.getByRole('alert').textContent).toContain('settings.profile.PASSWORD_SAVE_FAILED');
		expect(screen.getByLabelText('settings.profile.PASSWORD_NEW')).toBeTruthy();
	});
});
