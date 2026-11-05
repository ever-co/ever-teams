/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { TInviteVerified } from '@/core/types/schemas/user/invite.schema';
import { CompleteInvitationRegistrationForm } from './complete-invitation-registration-form';

const mockPush = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush })
}));
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	TERMS_LINK: ''
}));

const INVITATION = { fullName: 'Jane Cooper', email: 'jane@example.test' } as unknown as TInviteVerified;

beforeEach(() => {
	window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
});

function renderForm(onCompleteRegistration = jest.fn().mockResolvedValue(undefined)) {
	render(
		<CompleteInvitationRegistrationForm
			invitationData={INVITATION}
			onCompleteRegistration={onCompleteRegistration}
			acceptInvitationLoading={false}
		/>
	);
	return onCompleteRegistration;
}

function typePasswords(password: string, confirmation: string) {
	fireEvent.change(screen.getByLabelText('auth.field.NEW_PASSWORD_LABEL'), { target: { value: password } });
	fireEvent.change(screen.getByLabelText('auth.field.CONFIRM_PASSWORD_LABEL'), { target: { value: confirmation } });
}

async function join() {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'common.JOIN_REQUEST' }));
	});
}

describe('CompleteInvitationRegistrationForm', () => {
	it('refuses a password shorter than the minimum before joining', async () => {
		const onCompleteRegistration = renderForm();
		typePasswords('short', 'short');

		await join();

		expect(screen.getByRole('alert').textContent).toBe('auth.password.RULE_MIN_LENGTH');
		expect(onCompleteRegistration).not.toHaveBeenCalled();
	});

	it('joins with a long enough password that matches', async () => {
		const onCompleteRegistration = renderForm();
		typePasswords('long enough', 'long enough');

		await join();

		expect(onCompleteRegistration).toHaveBeenCalledWith(
			expect.objectContaining({ fullName: 'Jane Cooper', password: 'long enough' })
		);
	});

	it('clears the mismatch error once the confirmation is edited', async () => {
		renderForm();
		typePasswords('long enough', 'long enougj');
		await join();
		expect(screen.getByRole('alert').textContent).toBe('errors.PASSWORDS_DO_NOT_MATCH');

		fireEvent.change(screen.getByLabelText('auth.field.CONFIRM_PASSWORD_LABEL'), {
			target: { value: 'long enough' }
		});

		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('clears the length error once the password is edited', async () => {
		renderForm();
		typePasswords('short', 'short');
		await join();

		fireEvent.change(screen.getByLabelText('auth.field.NEW_PASSWORD_LABEL'), { target: { value: 'shorter' } });

		expect(screen.queryByRole('alert')).toBeNull();
	});
});
