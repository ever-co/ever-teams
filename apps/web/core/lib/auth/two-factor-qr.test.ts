import QRCode from 'qrcode';
import { TWO_FACTOR_QR_OPTIONS, twoFactorQrImageOf } from './two-factor-qr';

const OTPAUTH = 'otpauth://totp/Ever%20Teams:ada%40example.org?secret=JBSWY3DPEHPK3PXP&issuer=Ever%20Teams';

describe('twoFactorQrImageOf', () => {
	it('draws the QR code of the setup address itself', async () => {
		const image = await twoFactorQrImageOf(OTPAUTH);

		expect(image.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
		const svg = decodeURIComponent(image.slice(image.indexOf(',') + 1));
		expect(svg).toBe(await QRCode.toString(OTPAUTH, TWO_FACTOR_QR_OPTIONS));
		expect(svg).not.toBe(await QRCode.toString(OTPAUTH.replace('JBSW', 'KBSW'), TWO_FACTOR_QR_OPTIONS));
	});

	it('draws dark modules on a white tile, readable in either theme', async () => {
		const svg = decodeURIComponent((await twoFactorQrImageOf(OTPAUTH)).split(',')[1]);

		expect(svg).toContain('fill="#ffffff"');
		expect(svg).toContain('stroke="#000000"');
	});
});
