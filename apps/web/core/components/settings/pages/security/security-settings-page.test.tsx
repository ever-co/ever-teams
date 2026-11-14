/** @jest-environment jsdom */
// cspell:ignore DPEHPK EHPK JBSW JBSWY
import { act, fireEvent, render, screen } from '@testing-library/react';

const mockSettings = jest.fn();
jest.mock('@/core/hooks/auth/use-two-factor-settings', () => ({ useTwoFactorSettings: () => mockSettings() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key,
	useFormatter: () => ({ dateTime: () => 'Nov 14, 2026' })
}));

import { SecuritySettingsPage } from './security-settings-page';
import { twoFactorQrImageOf } from '@/core/lib/auth/two-factor-qr';

const OFF = {
	available: true,
	enabled: false,
	enabledAt: null,
	pendingEnrollment: false,
	recoveryCodesLeft: 0,
	requiredByOrganization: false
};

function mutation(result?: unknown) {
	return { mutateAsync: jest.fn().mockResolvedValue(result), isPending: false };
}

function settingsOf(overrides: Record<string, unknown> = {}) {
	return {
		status: OFF,
		availability: 'ready',
		retry: jest.fn(),
		enroll: mutation({
			secret: 'JBSWY3DPEHPK3PXP',
			otpauthUrl: 'otpauth://totp/Ever%20Teams:ada?secret=JBSWY3DPEHPK3PXP'
		}),
		confirm: mutation({ enabledAt: '2026-11-14T12:00:00.000Z', recoveryCodes: ['AAAAA-BBBBB', 'CCCCC-DDDDD'] }),
		disable: mutation(OFF),
		regenerate: mutation({ recoveryCodes: ['EEEEE-FFFFF'] }),
		...overrides
	};
}

describe('SecuritySettingsPage', () => {
	beforeAll(() => {
		// The notices' orb asks whether motion is reduced
		window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
		// jsdom has no TextEncoder, which browsers and Node have: the QR code encodes the address with it
		Object.assign(globalThis, { TextEncoder: jest.requireActual<typeof import('util')>('util').TextEncoder });
	});

	it('offers to turn it on, then shows the key and asks for the first code', async () => {
		const settings = settingsOf();
		mockSettings.mockReturnValue(settings);
		render(<SecuritySettingsPage />);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'settings.security.TURN_ON' }));
		});

		expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeTruthy();
		// The QR code encodes the setup address: drawn again with the library, the image is the same
		const qr = (await screen.findByRole('img', { name: 'settings.security.QR_ALT' })) as HTMLImageElement;
		expect(qr.getAttribute('src')).toBe(
			await twoFactorQrImageOf('otpauth://totp/Ever%20Teams:ada?secret=JBSWY3DPEHPK3PXP')
		);
		expect(screen.getByPlaceholderText('000000').getAttribute('aria-required')).toBe('true');
		expect(screen.getByRole('link', { name: 'settings.security.OPEN_IN_APP' }).getAttribute('href')).toContain(
			'otpauth://totp/'
		);

		fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'settings.security.TURN_ON' }));
		});

		expect(settings.confirm.mutateAsync).toHaveBeenCalledWith('123456');
		expect(screen.getByText('AAAAA-BBBBB')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'settings.security.DOWNLOAD_CODES' })).toBeTruthy();
	});

	it('keeps the setup open with the reason when the first code is wrong', async () => {
		const settings = settingsOf({
			confirm: { mutateAsync: jest.fn().mockRejectedValue({ statusCode: 401 }), isPending: false }
		});
		mockSettings.mockReturnValue(settings);
		render(<SecuritySettingsPage />);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'settings.security.TURN_ON' }));
		});
		fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '000000' } });
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'settings.security.TURN_ON' }));
		});

		expect(screen.getByRole('alert').textContent).toBe('settings.security.WRONG_CODE');
		expect(screen.getByPlaceholderText('000000')).toBeTruthy();
	});

	it('turns it off with a code, and says when it was turned on and how many codes are left', async () => {
		const settings = settingsOf({
			status: { ...OFF, enabled: true, enabledAt: '2026-11-14T12:00:00.000Z', recoveryCodesLeft: 9 }
		});
		mockSettings.mockReturnValue(settings);
		render(<SecuritySettingsPage />);

		expect(screen.getByText('settings.security.ON_SINCE {"date":"Nov 14, 2026"}')).toBeTruthy();
		expect(screen.getByText('settings.security.CODES_LEFT {"count":9}')).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: 'settings.security.TURN_OFF' }));
		fireEvent.change(screen.getByLabelText('settings.security.TURN_OFF_PROOF'), { target: { value: '654321' } });
		await act(async () => {
			fireEvent.submit(
				screen.getByLabelText('settings.security.TURN_OFF_PROOF').closest('form') as HTMLFormElement
			);
		});

		expect(settings.disable.mutateAsync).toHaveBeenCalledWith({ code: '654321' });
	});

	it('says the server does not offer it, and offers nothing to turn on, while the status reads unavailable', () => {
		mockSettings.mockReturnValue(settingsOf({ status: { ...OFF, available: false } }));
		render(<SecuritySettingsPage />);

		expect(screen.getByText('settings.security.UNAVAILABLE_TITLE')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'settings.security.TURN_ON' })).toBeNull();
	});

	it('says an API without two-factor authentication does not offer it', () => {
		mockSettings.mockReturnValue(settingsOf({ status: null, availability: 'unsupported' }));
		render(<SecuritySettingsPage />);

		expect(screen.getByText('settings.security.UNSUPPORTED_TITLE')).toBeTruthy();
	});

	it('asks to turn it on when the organization requires it', () => {
		mockSettings.mockReturnValue(settingsOf({ status: { ...OFF, requiredByOrganization: true } }));
		render(<SecuritySettingsPage />);

		expect(screen.getByText('settings.security.REQUIRED_TITLE')).toBeTruthy();
	});
});
