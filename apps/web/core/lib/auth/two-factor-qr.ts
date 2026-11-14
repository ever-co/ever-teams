import QRCode from 'qrcode';

/**
 * How the setup's QR code is drawn: dark modules on a white tile with a quiet zone, which every authenticator app
 * reads in either theme. A test draws it again with the same options to check the image encodes the address.
 */
export const TWO_FACTOR_QR_OPTIONS = {
	type: 'svg',
	errorCorrectionLevel: 'M',
	margin: 2,
	color: { dark: '#000000ff', light: '#ffffffff' }
} as const;

/** The QR code of an `otpauth://` address, as an SVG image the page can show. */
export async function twoFactorQrImageOf(otpauthUrl: string): Promise<string> {
	const svg = await QRCode.toString(otpauthUrl, TWO_FACTOR_QR_OPTIONS);
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
