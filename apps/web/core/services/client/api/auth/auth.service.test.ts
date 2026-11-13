/**
 * Asking for a sign-in code. Gauzy sends the e-mail, so the request says whose e-mail it is. In direct mode the
 * browser gives Gauzy this app's branding and the link to its sign-in page (`/auth/passcode` takes the link's
 * `?email=&code=`); it used to give the address alone, and the e-mail came out as Gauzy's, with a link to Gauzy's own
 * app. In proxy mode this app's route builds both from its configuration, so the browser sends the address only.
 */
const mockAppBranding = {
	appName: 'Ever Teams',
	appSignature: 'The Ever Teams team',
	companyName: 'Ever Co.',
	appLogo: 'https://teams.example.org/assets/ever-teams.png',
	appLink: 'https://teams.example.org/',
	companyLink: 'https://ever.co/'
};

jest.mock('@/core/lib/helpers/app-email-branding', () => ({ appEmailBranding: () => mockAppBranding }));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { authService } from './auth.service';

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
