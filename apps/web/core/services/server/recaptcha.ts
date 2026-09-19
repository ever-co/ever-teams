import { readRuntimeEnv } from '@/env-config';

/**
 * Server-side check of the signup captcha token (app/api/auth/register/route.ts).
 *
 * The signup form renders hCaptcha when NEXT_PUBLIC_CAPTCHA_TYPE is 'hcaptcha', Cloudflare Turnstile when it is
 * 'cloudflare' and Google reCAPTCHA v2 otherwise (core/components/pages/auth/signup/page-component.tsx). A token
 * can only be verified by the provider that issued it, so the verify endpoint follows the same RUNTIME value.
 * Every token used to be sent to Google, so a self-hosted image configured for hCaptcha or Turnstile rejected
 * every signup as soon as CAPTCHA_SECRET_KEY was set.
 */
const HCAPTCHA_VERIFY_URL = 'https://api.hcaptcha.com/siteverify';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * The deployment's captcha provider, read from the container env on every call. Same expression (and the same
 * exact, case-sensitive match below) as CAPTCHA_TYPE in core/constants/config/constants.tsx, which picks the
 * widget, so the server always verifies against the provider the form rendered.
 */
function runtimeCaptchaType(): string | undefined {
	return readRuntimeEnv('NEXT_PUBLIC_CAPTCHA_TYPE') || process.env.NEXT_PUBLIC_CAPTCHA_TYPE;
}

export function recaptchaVerification({
	secret,
	response,
	type = runtimeCaptchaType()
}: {
	secret: string;
	response: string;
	/** 'hcaptcha' | 'cloudflare' | anything else (Google). Defaults to the runtime NEXT_PUBLIC_CAPTCHA_TYPE. */
	type?: string;
}): Promise<{ success: boolean }> {
	switch (type) {
		case 'hcaptcha':
			return siteVerify(HCAPTCHA_VERIFY_URL, secret, response);
		case 'cloudflare':
			return siteVerify(TURNSTILE_VERIFY_URL, secret, response);
		default:
			// Google reCAPTCHA v2 — the request production relies on, kept exactly as it was.
			return fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${response}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			}).then((res) => res.json());
	}
}

/**
 * hCaptcha and Turnstile share one contract: a form-encoded POST body carrying `secret` and `response`, answered
 * with `{ success: boolean, ... }`. Errors propagate like the Google path's do.
 */
function siteVerify(url: string, secret: string, response: string): Promise<{ success: boolean }> {
	return fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({ secret, response }).toString()
	}).then((res) => res.json());
}
