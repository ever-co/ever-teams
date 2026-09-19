/**
 * Server-side captcha verification must follow the provider the signup form rendered.
 *
 * The form picks hCaptcha / Cloudflare Turnstile / Google reCAPTCHA from NEXT_PUBLIC_CAPTCHA_TYPE at RUNTIME, but
 * every token used to be verified by Google, which rejects hCaptcha and Turnstile tokens: a self-hosted image
 * configured for either could not sign anyone up once CAPTCHA_SECRET_KEY was set. The Google request itself is
 * what production uses, so it is pinned byte for byte.
 */
import { recaptchaVerification } from './recaptcha';

const GOOGLE = 'https://www.google.com/recaptcha/api/siteverify';
const HCAPTCHA = 'https://api.hcaptcha.com/siteverify';
const TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const FORM_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded' };

const fetchMock = jest.fn();
const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_TYPE = process.env.NEXT_PUBLIC_CAPTCHA_TYPE;

function setCaptchaType(value: string | undefined) {
	if (value === undefined) delete process.env.NEXT_PUBLIC_CAPTCHA_TYPE;
	else process.env.NEXT_PUBLIC_CAPTCHA_TYPE = value;
}

function reply(body: unknown) {
	fetchMock.mockResolvedValue({ json: () => Promise.resolve(body) });
}

/** The single fetch call's URL and init. */
function sentRequest(): [string, RequestInit] {
	expect(fetchMock).toHaveBeenCalledTimes(1);
	return fetchMock.mock.calls[0] as [string, RequestInit];
}

beforeEach(() => {
	global.fetch = fetchMock as unknown as typeof fetch;
	reply({ success: true });
});

afterEach(() => {
	global.fetch = ORIGINAL_FETCH;
	setCaptchaType(ORIGINAL_TYPE);
	fetchMock.mockReset();
});

describe('recaptchaVerification — Google reCAPTCHA (default)', () => {
	it.each([
		['unset', undefined],
		['empty', ''],
		['recaptcha', 'recaptcha'],
		['an unknown value', 'turnstile'],
		['a different case than the form matches (the form renders reCAPTCHA too)', 'HCaptcha']
	])('sends the unchanged Google request when NEXT_PUBLIC_CAPTCHA_TYPE is %s', async (_label, type) => {
		setCaptchaType(type);

		await expect(recaptchaVerification({ secret: 'secret-value', response: 'tok-1' })).resolves.toEqual({
			success: true
		});

		const [url, init] = sentRequest();
		expect(url).toBe(`${GOOGLE}?secret=secret-value&response=tok-1`);
		expect(init).toStrictEqual({ method: 'POST', headers: FORM_HEADERS });
	});

	it('lets a network failure reject, as it always has', async () => {
		fetchMock.mockRejectedValue(new TypeError('fetch failed'));

		await expect(recaptchaVerification({ secret: 'secret-value', response: 'tok-1' })).rejects.toThrow('fetch failed');
	});
});

describe.each([
	['hcaptcha', HCAPTCHA],
	['cloudflare', TURNSTILE]
])('recaptchaVerification — NEXT_PUBLIC_CAPTCHA_TYPE=%s', (type, endpoint) => {
	beforeEach(() => setCaptchaType(type));

	it('POSTs the secret and token form-encoded to the provider, never in the URL', async () => {
		await expect(recaptchaVerification({ secret: 'secret-value', response: 'tok-1' })).resolves.toEqual({
			success: true
		});

		const [url, init] = sentRequest();
		expect(url).toBe(endpoint);
		expect(init).toStrictEqual({ method: 'POST', headers: FORM_HEADERS, body: expect.any(String) });
		expect(Object.fromEntries(new URLSearchParams(init.body as string))).toEqual({
			secret: 'secret-value',
			response: 'tok-1'
		});
	});

	it('encodes values so a token cannot inject or truncate form fields', async () => {
		const response = 'a&secret=forged+b=c d/é%';

		await recaptchaVerification({ secret: 'k&y=1', response });

		const params = new URLSearchParams(sentRequest()[1].body as string);
		expect(params.getAll('secret')).toEqual(['k&y=1']);
		expect(params.getAll('response')).toEqual([response]);
	});

	it("returns the provider's verdict for the route to act on", async () => {
		reply({ success: false, 'error-codes': ['invalid-input-response'] });

		await expect(recaptchaVerification({ secret: 'secret-value', response: 'bad' })).resolves.toEqual({
			success: false,
			'error-codes': ['invalid-input-response']
		});
	});

	it('lets a network failure reject, like the Google path', async () => {
		fetchMock.mockRejectedValue(new TypeError('fetch failed'));

		await expect(recaptchaVerification({ secret: 'secret-value', response: 'tok-1' })).rejects.toThrow('fetch failed');
	});
});

describe('recaptchaVerification — provider selection', () => {
	it('reads NEXT_PUBLIC_CAPTCHA_TYPE on every call, not once at import (container env)', async () => {
		setCaptchaType(undefined);
		await recaptchaVerification({ secret: 's', response: 't' });
		setCaptchaType('hcaptcha');
		await recaptchaVerification({ secret: 's', response: 't' });
		setCaptchaType('cloudflare');
		await recaptchaVerification({ secret: 's', response: 't' });

		expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
			`${GOOGLE}?secret=s&response=t`,
			HCAPTCHA,
			TURNSTILE
		]);
	});

	it('lets an explicit `type` override the env', async () => {
		setCaptchaType('hcaptcha');
		await recaptchaVerification({ secret: 's', response: 't', type: 'cloudflare' });
		await recaptchaVerification({ secret: 's', response: 't', type: 'recaptcha' });

		expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([TURNSTILE, `${GOOGLE}?secret=s&response=t`]);
	});
});
