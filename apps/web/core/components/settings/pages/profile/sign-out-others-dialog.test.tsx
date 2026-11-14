/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

type MockConfirmDialogProps = {
	open: boolean;
	title: string;
	description?: React.ReactNode;
	confirmLabel: string;
	isPending: boolean;
	confirmDisabled?: boolean;
	error?: string | null;
	onConfirm: () => void;
	onClose: () => void;
	children?: React.ReactNode;
};

const mockToastSuccess = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	}
}));
jest.mock('sonner', () => ({
	toast: { success: (...args: unknown[]) => mockToastSuccess(...args) }
}));
jest.mock('@/core/components/icons', () => ({ LogOut: () => null, Shield: () => null, Spinner: () => null }));
jest.mock('@/core/components/settings/kit/danger', () => ({
	ConfirmDestructiveDialog: (props: MockConfirmDialogProps) => {
		if (!props.open) {
			return null;
		}
		return (
			<div role="dialog">
				<h2>{props.title}</h2>
				{props.children}
				{props.error && (
					<p role="alert" data-testid="footer-error">
						{props.error}
					</p>
				)}
				<button type="button" onClick={props.onClose}>
					cancel
				</button>
				<button type="button" onClick={props.onConfirm} disabled={props.isPending || props.confirmDisabled}>
					{props.confirmLabel}
				</button>
			</div>
		);
	}
}));

import { SignOutOthersDialog } from './sign-out-others-dialog';

const CONFIRM = /^settings\.sessions\.SIGN_OUT_OTHERS_CONFIRM/;

const mockSignOut = jest.fn();
const mockSendCode = jest.fn();
const mockClose = jest.fn();

function failure(status: number, code?: string) {
	return {
		message: `Request failed with status code ${status}`,
		status,
		response: { data: { code, message: 'refused' }, headers: {}, status, statusText: '' }
	};
}

function renderDialog() {
	return render(
		<SignOutOthersDialog
			open
			count={2}
			email="marie@example.com"
			onClose={mockClose}
			onSignOut={mockSignOut}
			onSendCode={mockSendCode}
		/>
	);
}

async function confirm() {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: CONFIRM }));
	});
}

function typePassword(value: string) {
	fireEvent.change(screen.getByLabelText('settings.sessions.PASSWORD_LABEL'), { target: { value } });
}

describe('SignOutOthersDialog', () => {
	beforeEach(() => {
		mockSignOut.mockReset();
		mockSendCode.mockReset();
		mockClose.mockReset();
		mockToastSuccess.mockReset();
	});

	it('asks for the password, and confirms nothing until one is typed', () => {
		renderDialog();

		expect(screen.getByRole('heading').textContent).toMatch(/settings\.sessions\.SIGN_OUT_OTHERS_TITLE .*2/);
		expect(screen.getByLabelText('settings.sessions.PASSWORD_LABEL').getAttribute('type')).toBe('password');
		expect((screen.getByRole('button', { name: CONFIRM }) as HTMLButtonElement).disabled).toBe(true);
	});

	it('signs the others out with the password, says how many went and closes', async () => {
		mockSignOut.mockResolvedValue(2);
		renderDialog();
		typePassword('secret-1');

		await confirm();

		expect(mockSignOut).toHaveBeenCalledWith({ password: 'secret-1' });
		expect(mockToastSuccess.mock.calls[0][0]).toMatch(/^settings\.sessions\.SIGNED_OUT_OTHERS .*"count":2/);
		expect(mockClose).toHaveBeenCalledTimes(1);
	});

	it('says a wrong password signed nobody out, and stays open', async () => {
		mockSignOut.mockRejectedValue(failure(400, 'SESSION_CONFIRMATION_INVALID'));
		renderDialog();
		typePassword('wrong');

		await confirm();

		expect(screen.getByRole('alert').textContent).toBe('settings.sessions.WRONG_PASSWORD');
		expect(mockClose).not.toHaveBeenCalled();
	});

	it('says why under the field, leaving the footer to its two buttons', async () => {
		mockSignOut.mockRejectedValue(failure(400, 'SESSION_CONFIRMATION_INVALID'));
		renderDialog();
		typePassword('wrong');

		await confirm();

		const alert = screen.getByRole('alert');
		expect(screen.queryByTestId('footer-error')).toBeNull();
		expect(alert.closest('form')).toBeTruthy();
		const field = screen.getByLabelText('settings.sessions.PASSWORD_LABEL');
		expect(field.getAttribute('aria-invalid')).toBe('true');
		expect(field.getAttribute('aria-describedby')).toBe(alert.id);
	});

	it('turns to the e-mailed code when the account has no password, and signs out with the code', async () => {
		mockSignOut.mockRejectedValueOnce(failure(400, 'SESSION_CONFIRMATION_REQUIRED')).mockResolvedValueOnce(2);
		mockSendCode.mockResolvedValue(undefined);
		renderDialog();
		typePassword('anything');
		await confirm();

		expect(screen.getByText('settings.sessions.NEEDS_CODE')).toBeTruthy();
		expect(screen.queryByLabelText('settings.sessions.PASSWORD_LABEL')).toBeNull();
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'settings.sessions.SEND_CODE' }));
		});
		expect(mockSendCode).toHaveBeenCalledTimes(1);
		expect(screen.getByText(/settings\.sessions\.CODE_SENT .*marie@example\.com/)).toBeTruthy();
		fireEvent.change(screen.getByLabelText('settings.sessions.CODE_LABEL'), { target: { value: ' 123456 ' } });
		await confirm();

		expect(mockSignOut).toHaveBeenLastCalledWith({ code: '123456' });
		expect(mockClose).toHaveBeenCalledTimes(1);
	});

	it('lets the person choose the code themselves, and back to the password', () => {
		renderDialog();

		fireEvent.click(screen.getByRole('button', { name: 'settings.sessions.USE_CODE' }));
		expect(screen.getByRole('button', { name: 'settings.sessions.SEND_CODE' })).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'settings.sessions.USE_PASSWORD' }));

		expect(screen.getByLabelText('settings.sessions.PASSWORD_LABEL')).toBeTruthy();
	});

	it('says the code e-mail could not be sent', async () => {
		mockSendCode.mockRejectedValue(failure(500));
		renderDialog();
		fireEvent.click(screen.getByRole('button', { name: 'settings.sessions.USE_CODE' }));

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'settings.sessions.SEND_CODE' }));
		});

		expect(screen.getByRole('alert').textContent).toMatch(
			/^settings\.sessions\.CODE_NOT_SENT .*toasts\.REASONS\.SERVER/
		);
	});

	it('asks to wait after too many attempts', async () => {
		mockSignOut.mockRejectedValue(failure(429));
		renderDialog();
		typePassword('secret-1');

		await confirm();

		expect(screen.getByRole('alert').textContent).toBe('settings.sessions.TOO_MANY_ATTEMPTS');
	});

	it('asks to sign in again when this device signed in before sessions were listed', async () => {
		mockSignOut.mockRejectedValue(failure(409, 'SESSION_UNKNOWN'));
		renderDialog();
		typePassword('secret-1');

		await confirm();

		expect(screen.getByRole('alert').textContent).toBe('settings.sessions.THIS_SESSION_UNKNOWN');
	});

	it('asks to try again when a session kept renewing while it was signed out', async () => {
		mockSignOut.mockRejectedValue(failure(409, 'SESSION_SIGN_OUT_INCOMPLETE'));
		renderDialog();
		typePassword('secret-1');

		await confirm();

		expect(screen.getByRole('alert').textContent).toBe('settings.sessions.SIGN_OUT_INCOMPLETE');
	});

	it('says any other failure with its reason', async () => {
		mockSignOut.mockRejectedValue(failure(500));
		renderDialog();
		typePassword('secret-1');

		await confirm();

		expect(screen.getByRole('alert').textContent).toMatch(
			/^settings\.sessions\.SIGN_OUT_OTHERS_FAILED .*toasts\.REASONS\.SERVER/
		);
	});
});
