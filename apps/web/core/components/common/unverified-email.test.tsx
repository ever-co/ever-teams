/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockVerify = jest.fn();
const mockResend = jest.fn();
const mockGetVerificationStatus = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockRefresh = jest.fn();
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({
	toast: {
		error: (...args: unknown[]) => mockToastError(...args),
		success: (...args: unknown[]) => mockToastSuccess(...args)
	}
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
jest.mock('@tanstack/react-query', () => ({
	...jest.requireActual('@tanstack/react-query'),
	useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries })
}));
jest.mock('@/core/hooks', () => ({
	useAuthenticateUser: () => ({ user: null }),
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() }),
	useQueryCall: (queryFunction: (...args: unknown[]) => Promise<unknown>) => ({
		loading: false,
		queryCall: (...args: unknown[]) => queryFunction(...args)
	})
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
jest.mock('@/core/services/client/api/auth/auth.service', () => ({
	authService: { resendVerifyUserLink: (...args: unknown[]) => mockResend(...args) }
}));
jest.mock('@/core/services/client/api/users/emails/email-verification.service', () => ({
	emailVerificationService: {
		verifyUserEmailByCode: (...args: unknown[]) => mockVerify(...args),
		getVerificationStatus: () => mockGetVerificationStatus()
	}
}));
jest.mock('./notice', () => ({
	Notice: ({
		title,
		description,
		actions
	}: {
		title?: React.ReactNode;
		description?: React.ReactNode;
		actions?: React.ReactNode;
	}) => (
		<section>
			<h4>{title}</h4>
			<p>{description}</p>
			{actions}
		</section>
	)
}));
jest.mock('@/core/components/icons', () => ({ Mail: () => null }));
jest.mock('@/core/components/duplicated-components/_button', () => ({
	Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
		<button type="button" onClick={onClick}>
			{children}
		</button>
	)
}));
jest.mock('@/core/lib/helpers/index', () => ({ getAccessTokenCookie: () => 'token' }));
jest.mock('@/core/constants/config/constants', () => ({ AUTH_CODE_LENGTH: 6 }));

import { ConfirmUserModal, UnverifiedEmail } from './unverified-email';

const user = { id: 'user-1', email: 'marie@acme.test' } as never;

function renderWithQueries(ui: React.ReactElement) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function settle() {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
}

async function confirmWith(code: string) {
	renderWithQueries(<ConfirmUserModal open user={user} closeModal={jest.fn()} />);
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

describe('UnverifiedEmail (#5677)', () => {
	const owner = { id: 'user-1', email: 'ruth@example.com', isEmailVerified: false } as never;
	const VERIFY_TITLE = 'notifications.NOTICES.VERIFY_TITLE';
	const RESEND = 'notifications.NOTICES.VERIFY_RESEND';

	beforeEach(() => {
		window.localStorage.clear();
		mockGetVerificationStatus.mockReset();
		mockResend.mockReset();
		mockInvalidateQueries.mockReset();
		mockToastError.mockReset();
		mockToastSuccess.mockReset();
	});

	it('asks for no code where the deployment verifies no address (the status route answers 404)', async () => {
		mockGetVerificationStatus.mockResolvedValue(null);

		renderWithQueries(<UnverifiedEmail user={owner} />);
		await settle();

		expect(screen.queryByText(VERIFY_TITLE)).toBeNull();
		expect(screen.queryByText(RESEND)).toBeNull();
		expect(mockGetVerificationStatus).toHaveBeenCalledTimes(1);
	});

	it('asks for the code it sent where the deployment verifies addresses', async () => {
		mockGetVerificationStatus.mockResolvedValue({ isEmailVerified: false, verificationEmailSent: true });

		renderWithQueries(<UnverifiedEmail user={owner} />);

		expect(await screen.findByText(VERIFY_TITLE)).toBeTruthy();
		expect(screen.getByText('notifications.NOTICES.VERIFY_TEXT')).toBeTruthy();
	});

	it('does not say a code was sent when none went out', async () => {
		mockGetVerificationStatus.mockResolvedValue({ isEmailVerified: false, verificationEmailSent: false });

		renderWithQueries(<UnverifiedEmail user={owner} />);

		expect(await screen.findByText('notifications.NOTICES.VERIFY_TEXT_NOT_SENT')).toBeTruthy();
		expect(screen.queryByText('notifications.NOTICES.VERIFY_TEXT')).toBeNull();
	});

	it('says on screen that no new code was sent when the API refuses it', async () => {
		mockGetVerificationStatus.mockResolvedValue({ isEmailVerified: false, verificationEmailSent: true });
		mockResend.mockRejectedValue({ statusCode: 429 });

		renderWithQueries(<UnverifiedEmail user={owner} />);
		fireEvent.click(await screen.findByText(RESEND));
		await settle();

		expect(mockResend).toHaveBeenCalledWith(owner);
		expect(mockToastError).toHaveBeenCalledWith('settings.profile.VERIFY_SEND_FAILED');
	});

	it('says a new code is on its way, and reads the status again, once the API sent it', async () => {
		mockGetVerificationStatus.mockResolvedValue({ isEmailVerified: false, verificationEmailSent: false });
		mockResend.mockResolvedValue({ data: { status: 202 } });

		renderWithQueries(<UnverifiedEmail user={owner} />);
		fireEvent.click(await screen.findByText(RESEND));
		await settle();

		expect(mockToastSuccess).toHaveBeenCalledWith('settings.profile.VERIFY_SENT');
		expect(mockInvalidateQueries).toHaveBeenCalledWith({
			queryKey: ['users', 'email-verification-status', 'user-1', null, 'ruth@example.com']
		});
	});
});
