/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { TTwoFactorSignIn } from '@/core/hooks/auth/use-two-factor-sign-in';
import { TwoFactorStep } from './two-factor-step';

jest.mock('next-intl', () => ({
	useTranslations: () => {
		const t = (key: string, values?: Record<string, unknown>) =>
			values ? `${key} ${JSON.stringify(values)}` : key;
		t.rich = (key: string) => key;
		return t;
	}
}));

function twoFactorOf(overrides: Partial<TTwoFactorSignIn> = {}): TTwoFactorSignIn {
	return {
		pending: {
			challenge: { challenge: 'signed.challenge', expiresAt: '2026-11-14T12:05:00.000Z' },
			selectedTeam: ''
		},
		ask: jest.fn(),
		cancel: jest.fn(),
		verify: jest.fn().mockResolvedValue(false),
		verifying: false,
		signedIn: false,
		failure: null,
		...overrides
	};
}

function typeCode(code: string) {
	const slots = screen.getAllByRole('textbox') as HTMLInputElement[];
	code.split('').forEach((digit, index) => {
		fireEvent.change(slots[index], { target: { value: digit } });
	});
	return slots;
}

describe('TwoFactorStep', () => {
	it('asks for the six digits of the authenticator app and sends them once all are typed', async () => {
		const twoFactor = twoFactorOf();
		render(<TwoFactorStep twoFactor={twoFactor} email="ada@example.org" onRestart={jest.fn()} />);

		expect(screen.getAllByRole('textbox')).toHaveLength(6);
		await act(async () => {
			typeCode('123456');
		});

		expect(twoFactor.verify).toHaveBeenCalledWith({ code: '123456' });
	});

	it('says a code is wrong and keeps the step open', () => {
		render(
			<TwoFactorStep
				twoFactor={twoFactorOf({ failure: { kind: 'wrong-code' } })}
				email="ada@example.org"
				onRestart={jest.fn()}
			/>
		);

		expect(screen.getByRole('alert').textContent).toContain('auth.twoFactor.WRONG_CODE');
		expect((screen.getByRole('button', { name: 'auth.twoFactor.SUBMIT' }) as HTMLButtonElement).disabled).toBe(
			false
		);
	});

	it('says how long to wait after too many codes', () => {
		render(
			<TwoFactorStep
				twoFactor={twoFactorOf({ failure: { kind: 'too-many', minutes: 14 } })}
				email="ada@example.org"
				onRestart={jest.fn()}
			/>
		);

		expect(screen.getByRole('alert').textContent).toContain('auth.twoFactor.TOO_MANY {"minutes":14}');
	});

	it('takes a recovery code instead, written as the API writes it', async () => {
		const twoFactor = twoFactorOf();
		render(<TwoFactorStep twoFactor={twoFactor} email="ada@example.org" onRestart={jest.fn()} />);

		fireEvent.click(screen.getByRole('button', { name: 'auth.twoFactor.USE_RECOVERY' }));
		fireEvent.change(screen.getByLabelText('auth.twoFactor.RECOVERY_LABEL'), { target: { value: 'abcde-fghij' } });
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'auth.twoFactor.SUBMIT' }));
		});

		expect(twoFactor.verify).toHaveBeenCalledWith({ recoveryCode: 'ABCDE-FGHIJ' });
	});

	it('refuses an incomplete code without asking the API', async () => {
		const twoFactor = twoFactorOf();
		render(<TwoFactorStep twoFactor={twoFactor} email="ada@example.org" onRestart={jest.fn()} />);

		await act(async () => {
			typeCode('123');
			fireEvent.click(screen.getByRole('button', { name: 'auth.twoFactor.SUBMIT' }));
		});

		expect(twoFactor.verify).not.toHaveBeenCalled();
		expect(screen.getByRole('alert').textContent).toContain('auth.twoFactor.CODE_INCOMPLETE');
	});

	it('starts the sign-in again once its challenge has ended', () => {
		const onRestart = jest.fn();
		render(
			<TwoFactorStep
				twoFactor={twoFactorOf({ failure: { kind: 'expired' } })}
				email="ada@example.org"
				onRestart={onRestart}
			/>
		);

		fireEvent.click(screen.getByRole('button', { name: 'auth.twoFactor.SIGN_IN_AGAIN' }));

		expect(onRestart).toHaveBeenCalled();
	});
});
