/**
 * The sign-in code request of proxy mode. Gauzy sends the e-mail, so the request says whose e-mail it is: it carries
 * this app's branding and the link to its sign-in page. It used to carry the app's name alone, and the logo, the
 * signature and the footer of the e-mail were Gauzy's.
 */
import { signInEmailRequest } from './auth';

const mockServerFetch = jest.fn();
const mockAppBranding = {
	appName: 'Ever Teams',
	appSignature: 'The Ever Teams team',
	companyName: 'Ever Co.',
	appLogo: 'https://teams.example.org/assets/ever-teams.png',
	appLink: 'https://teams.example.org/',
	companyLink: 'https://ever.co/'
};

jest.mock('../fetch', () => ({
	serverFetch: (...args: unknown[]) => mockServerFetch(...args)
}));
jest.mock('@/core/lib/helpers/app-email-branding', () => ({ appEmailBranding: () => mockAppBranding }));

describe('signInEmailRequest', () => {
	it("asks Gauzy for the code with this app's branding and the link to its sign-in page", async () => {
		mockServerFetch.mockResolvedValue({ data: { status: 200, message: 'OK' } });

		await signInEmailRequest('ada@example.org', 'https://teams.example.org/auth/passcode');

		expect(mockServerFetch).toHaveBeenCalledWith({
			path: '/auth/signin.email',
			method: 'POST',
			body: {
				email: 'ada@example.org',
				...mockAppBranding,
				appMagicSignUrl: 'https://teams.example.org/auth/passcode'
			}
		});
	});
});
