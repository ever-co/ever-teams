/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

const mockVerify = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockRefresh = jest.fn();
const mockToastError = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => mockToastError(...args) } }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
jest.mock('@tanstack/react-query', () => ({
	useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries })
}));
jest.mock('@/core/hooks', () => ({
	useAuthenticateUser: () => ({ user: null }),
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() }),
	useQueryCall: () => ({ loading: false, queryCall: (...args: unknown[]) => mockVerify(...args) })
}));
jest.mock('@/core/components', () => ({
	Button: ({ children, disabled }: { children?: React.ReactNode; disabled?: boolean }) => (
		<button type="submit" disabled={disabled}>
			{children}
		</button>
	),
	Modal: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
	SpinnerLoader: () => null,
	Text: { Heading: ({ children }: { children?: React.ReactNode }) => <h3>{children}</h3> }
}));
jest.mock('../auth/auth-code-input', () => ({
	AuthCodeInputField: ({ onChange }: { onChange: (code: string) => void }) => (
		<input aria-label="code" onChange={(event) => onChange(event.target.value)} />
	)
}));
jest.mock('@/core/services/client/api/auth/auth.service', () => ({ authService: { resendVerifyUserLink: jest.fn() } }));
jest.mock('@/core/services/client/api/users/emails/email-verification.service', () => ({
	emailVerificationService: { verifyUserEmailByCode: jest.fn() }
}));
jest.mock('./notice', () => ({ Notice: () => null }));
jest.mock('@/core/components/icons', () => ({ Mail: () => null }));
jest.mock('@/core/components/duplicated-components/_button', () => ({ Button: () => null }));
jest.mock('@/core/lib/helpers/index', () => ({ getAccessTokenCookie: () => 'token' }));
jest.mock('@/core/constants/config/constants', () => ({ AUTH_CODE_LENGTH: 6 }));

import { ConfirmUserModal } from './unverified-email';

const user = { id: 'user-1', email: 'marie@acme.test' } as never;

async function confirmWith(code: string) {
	render(<ConfirmUserModal open user={user} closeModal={jest.fn()} />);
	fireEvent.change(screen.getByLabelText('code'), { target: { value: code } });
	await act(async () => {
		fireEvent.submit(screen.getByText('common.CONFIRM').closest('form') as HTMLFormElement);
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
}

describe('ConfirmUserModal', () => {
	beforeEach(() => {
		mockVerify.mockReset();
		mockInvalidateQueries.mockReset();
		mockRefresh.mockReset();
		mockToastError.mockReset();
	});

	it('reads the signed-in user again once the address is confirmed', async () => {
		mockVerify.mockResolvedValue({ data: { status: 200 } });

		await confirmWith('ABC123');

		expect(mockVerify).toHaveBeenCalledWith({ code: 'ABC123', email: 'marie@acme.test' });
		expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['users', 'me'] });
		expect(mockRefresh).toHaveBeenCalled();
	});

	it('says a refused code was not taken, without reading the user again', async () => {
		mockVerify.mockRejectedValue({ response: { status: 400 } });

		await confirmWith('ABC123');

		expect(mockToastError).toHaveBeenCalledWith('pages.auth.INVALID_CODE_TRY_AGAIN');
		expect(mockInvalidateQueries).not.toHaveBeenCalled();
		expect(mockRefresh).toHaveBeenCalled();
	});
});
