/**
 * The e-mail branding Gauzy receives with the Ever ID sign-in and the account deletion requests: https links only,
 * and no blank value (Gauzy takes https links only and would use an empty name as it is).
 */
const mockBranding = {
	APP_NAME: 'Ever Teams',
	APP_SIGNATURE: 'The Ever Teams team',
	COMPANY_NAME: 'Ever Co.',
	APP_LOGO_URL: 'https://app.ever.team/assets/ever-teams.png',
	APP_LINK: 'https://ever.team',
	COMPANY_LINK: 'https://ever.co'
};

jest.mock('@/core/constants/config/constants', () => ({
	get APP_NAME() {
		return mockBranding.APP_NAME;
	},
	get APP_SIGNATURE() {
		return mockBranding.APP_SIGNATURE;
	},
	get COMPANY_NAME() {
		return mockBranding.COMPANY_NAME;
	},
	get APP_LOGO_URL() {
		return mockBranding.APP_LOGO_URL;
	},
	get APP_LINK() {
		return mockBranding.APP_LINK;
	},
	get COMPANY_LINK() {
		return mockBranding.COMPANY_LINK;
	}
}));

import { appEmailBranding, httpsLink } from './app-email-branding';

const defaults = { ...mockBranding };

afterEach(() => {
	Object.assign(mockBranding, defaults);
});

describe('httpsLink', () => {
	it('keeps an absolute https URL', () => {
		expect(httpsLink('https://ever.team/path?q=1')).toBe('https://ever.team/path?q=1');
	});

	it.each([
		['a relative logo path', '/assets/ever-teams.png'],
		['an http link', 'http://ever.team'],
		['a whitespace-only value', '   '],
		['no value', undefined],
		['another scheme', 'javascript:alert(1)']
	])('drops %s', (_case, value) => {
		expect(httpsLink(value)).toBeUndefined();
	});
});

describe('appEmailBranding', () => {
	it('sends every configured value, links as https URLs', () => {
		expect(appEmailBranding()).toEqual({
			appName: 'Ever Teams',
			appSignature: 'The Ever Teams team',
			companyName: 'Ever Co.',
			appLogo: 'https://app.ever.team/assets/ever-teams.png',
			appLink: 'https://ever.team/',
			companyLink: 'https://ever.co/'
		});
	});

	it('leaves out an http APP_LINK, a relative logo and whitespace-only values', () => {
		Object.assign(mockBranding, {
			APP_LINK: 'http://ever.team',
			APP_LOGO_URL: '/assets/ever-teams.png',
			APP_SIGNATURE: '   ',
			COMPANY_NAME: ''
		});

		expect(appEmailBranding()).toEqual({
			appName: 'Ever Teams',
			companyLink: 'https://ever.co/'
		});
	});
});
