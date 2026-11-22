/** @jest-environment jsdom */

/**
 * The profile's verification panel says a code was sent only when one went out (ever-co/ever-teams#5677): when the API
 * says none is valid, it offers to send one, and once the person sent one it says so.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components/icons', () => ({ Spinner: () => null }));
jest.mock('@/core/components/auth/auth-code-input', () => ({
	AuthCodeInputField: React.forwardRef(function CodeField() {
		return <input aria-label="code" />;
	})
}));

import { EmailVerificationPanel } from './email-verification-panel';

function renderPanel(codeWasSent: boolean, onSendCode = jest.fn().mockResolvedValue(undefined)) {
	render(
		<EmailVerificationPanel
			email="ruth@example.com"
			codeWasSent={codeWasSent}
			onSendCode={onSendCode}
			isSendingCode={false}
			onVerify={jest.fn()}
			isVerifying={false}
			onVerified={jest.fn()}
		/>
	);
	return onSendCode;
}

describe('EmailVerificationPanel', () => {
	it('asks for the code that was sent when the API says a valid one went out', () => {
		renderPanel(true);

		expect(screen.getByText('settings.profile.VERIFY_TEXT')).toBeTruthy();
	});

	it('offers to send a code, without saying one was sent, when none went out', () => {
		renderPanel(false);

		expect(screen.getByText('notifications.NOTICES.VERIFY_TEXT_NOT_SENT')).toBeTruthy();
		expect(screen.queryByText('settings.profile.VERIFY_TEXT')).toBeNull();
	});

	it('asks for the code once the person sent one', async () => {
		const onSendCode = renderPanel(false);

		await act(async () => {
			fireEvent.click(screen.getByText('notifications.NOTICES.VERIFY_RESEND'));
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		expect(onSendCode).toHaveBeenCalledTimes(1);
		expect(screen.getByText('settings.profile.VERIFY_TEXT')).toBeTruthy();
	});
});
