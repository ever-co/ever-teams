// cspell:ignore FGHIJ
/**
 * Asking for a sign-in code. Gauzy sends the e-mail, so the request says whose e-mail it is. In direct mode the
 * browser gives Gauzy this app's branding and the link to its sign-in page (`/auth/passcode` takes the link's
 * `?email=&code=`); it used to give the address alone, and the e-mail came out as Gauzy's, with a link to Gauzy's own
 * app. In proxy mode this app's route builds both from its configuration, so the browser sends the address only.
 *
 * Asking for a password reset link works the same way for the page the link opens: Gauzy's own route,
 * `<client>/#/auth/reset-password`, is not a page of this app, so the request names `/auth/reset-password`.
 */
const mockAppBranding = {
	appName: 'Ever Teams',
	appSignature: 'The Ever Teams team',
	companyName: 'Ever Co.',
	appLogo: 'https://teams.example.org/assets/ever-teams.png',
	appLink: 'https://teams.example.org/',
	companyLink: 'https://ever.co/'
};
const mockFallbackPost = jest.fn();

jest.mock('@/core/lib/helpers/app-email-branding', () => ({ appEmailBranding: () => mockAppBranding }));
jest.mock('../../api.service', () => ({
	...jest.requireActual('../../api.service'),
	getFallbackAPI: async () => ({ post: mockFallbackPost })
}));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { authService } from './auth.service';
import { signinService } from './signin.service';

const PAGE_ORIGIN = 'https://teams.example.org';

/** Direct mode is on when the deployment publishes Gauzy's URL to the browser; proxy mode publishes none (''). */
function publishApiUrl(url: string) {
	jest.spyOn(GAUZY_API_BASE_SERVER_URL, 'value', 'get').mockReturnValue(url);
}

function answerPost() {
	return jest.spyOn(authService, 'post').mockResolvedValue({ data: { status: 200, message: 'OK' } } as never);
}

beforeEach(() => {
	// The page the person asks from: the suite runs without a DOM
	Object.defineProperty(globalThis, 'location', { configurable: true, value: { origin: PAGE_ORIGIN } });
});

afterEach(() => {
	jest.restoreAllMocks();
	delete (globalThis as { location?: unknown }).location;
});

describe('authService, asking for a sign-in code', () => {
	it.each(['signInEmail', 'sendAuthCode'] as const)(
		'%s gives Gauzy the branding and the link to the sign-in page in direct mode',
		async (method) => {
			publishApiUrl('https://api.example.org');
			const post = answerPost();

			await authService[method]('ada@example.org');

			expect(post).toHaveBeenCalledTimes(1);
			expect(post).toHaveBeenCalledWith('/auth/signin.email', {
				email: 'ada@example.org',
				...mockAppBranding,
				appMagicSignUrl: `${PAGE_ORIGIN}/auth/passcode`
			});
		}
	);

	it("sends this app's route the address alone in proxy mode", async () => {
		publishApiUrl('');
		const post = answerPost();

		await authService.signInEmail('ada@example.org');

		expect(post).toHaveBeenCalledTimes(1);
		expect(post).toHaveBeenCalledWith('/auth/signin-email', { email: 'ada@example.org' });
	});
});

describe('authService, asking for a password reset link', () => {
	it("names this app's reset page to Gauzy in direct mode", async () => {
		publishApiUrl('https://api.example.org');
		const post = answerPost();

		await authService.requestPassword('ada@example.org');

		expect(post).toHaveBeenCalledTimes(1);
		expect(post).toHaveBeenCalledWith('/auth/request-password', {
			email: 'ada@example.org',
			appResetPasswordUrl: `${PAGE_ORIGIN}/auth/reset-password`
		});
		expect(mockFallbackPost).not.toHaveBeenCalled();
	});

	it("sends this app's route the address alone in proxy mode", async () => {
		publishApiUrl('');
		const post = answerPost();
		mockFallbackPost.mockResolvedValue({ data: true });

		await authService.requestPassword('ada@example.org');

		expect(mockFallbackPost).toHaveBeenCalledTimes(1);
		expect(mockFallbackPost).toHaveBeenCalledWith('/auth/request-password', { email: 'ada@example.org' });
		expect(post).not.toHaveBeenCalled();
	});
});

describe('authService, the code step of a sign-in that asks for a second factor', () => {
	const proof = { challenge: 'signed.challenge', code: '123456' };

	it("completes it at this app's route in proxy mode, with the team to open", async () => {
		publishApiUrl('');
		mockFallbackPost.mockResolvedValue({ data: { loginResponse: {} } });

		await authService.verifyTwoFactor({ ...proof, selectedTeam: 'team-1' });

		expect(mockFallbackPost).toHaveBeenCalledWith(
			'/auth/two-factor/verify',
			{ ...proof, teamId: 'team-1' },
			{ expectedUnauthorized: true, secretResponse: true },
			false
		);
	});

	it('completes it at Gauzy in direct mode', async () => {
		publishApiUrl('https://api.example.org');
		const verify = jest.spyOn(signinService, 'verifyTwoFactorGauzy').mockResolvedValue({} as never);

		await authService.verifyTwoFactor({
			challenge: 'signed.challenge',
			recoveryCode: 'ABCDE-FGHIJ',
			selectedTeam: ''
		});

		expect(verify).toHaveBeenCalledWith({ challenge: 'signed.challenge', recoveryCode: 'ABCDE-FGHIJ', teamId: '' });
		expect(mockFallbackPost).not.toHaveBeenCalled();
	});
});
