/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ResendCode } from './resend-code';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

async function clickResend() {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'auth.code.RESEND' }));
	});
}

describe('ResendCode', () => {
	it('starts the wait once a new code went out', async () => {
		render(<ResendCode startLocked={false} sending={false} onResend={jest.fn().mockResolvedValue(true)} />);

		await clickResend();

		expect(screen.getByText('auth.code.RESEND_IN')).toBeTruthy();
	});

	it('leaves the button ready when no code went out', async () => {
		const onResend = jest.fn().mockResolvedValue(false);
		render(<ResendCode startLocked={false} sending={false} onResend={onResend} />);

		await clickResend();

		expect(onResend).toHaveBeenCalledTimes(1);
		expect(screen.queryByText('auth.code.RESEND_IN')).toBeNull();
		expect(screen.getByRole('button', { name: 'auth.code.RESEND' })).toBeTruthy();
	});
});
