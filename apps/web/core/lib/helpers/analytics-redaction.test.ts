import type { CaptureResult } from 'posthog-js';
import { redactCaptureResult, redactUrl } from './analytics-redaction';

/**
 * PostHog records the full address of every page in its events, and the pages the auth e-mails open carry a live
 * credential in it. The `before_send` hook replaces those parameters before an event leaves the browser.
 */
describe('redactUrl', () => {
	it.each([
		[
			'a password reset link',
			'https://app.ever.team/auth/reset-password?token=eyJhbGciOi.payload.sig',
			'https://app.ever.team/auth/reset-password?token=redacted'
		],
		[
			'an invitation link',
			'https://app.ever.team/auth/accept-invite?email=ada%40example.com&code=123456',
			'https://app.ever.team/auth/accept-invite?email=redacted&code=redacted'
		],
		[
			'a magic sign-in link',
			'https://app.ever.team/auth/passcode?email=ada%40example.com&code=AB12CD34',
			'https://app.ever.team/auth/passcode?email=redacted&code=redacted'
		],
		[
			'an e-mail verification link',
			'https://app.ever.team/verify-email?email=ada%40example.com&token=abc',
			'https://app.ever.team/verify-email?email=redacted&token=redacted'
		],
		[
			'an OAuth callback',
			'https://app.ever.team/api/auth/callback/github?code=abc&state=xyz',
			'https://app.ever.team/api/auth/callback/github?code=redacted&state=redacted'
		],
		[
			'tokens in the fragment',
			'https://app.ever.team/#access_token=abc&id_token=def&kept=1',
			'https://app.ever.team/#access_token=redacted&id_token=redacted&kept=1'
		],
		['a parameter in another case', 'https://app.ever.team/x?Token=abc', 'https://app.ever.team/x?Token=redacted']
	])('redacts %s', (_label, url, expected) => {
		expect(redactUrl(url)).toBe(expected);
	});

	it('keeps every other parameter, in order', () => {
		expect(redactUrl('https://app.ever.team/x?utm_source=mail&token=abc&tab=2')).toBe(
			'https://app.ever.team/x?utm_source=mail&token=redacted&tab=2'
		);
	});

	it.each([
		'https://app.ever.team/tasks?tab=2&utm_source=mail',
		'https://app.ever.team/settings#team',
		'/auth/reset-password?token=not-an-absolute-url',
		'Sign in',
		'http://[not a url'
	])('leaves %s unchanged', (value) => {
		expect(redactUrl(value)).toBe(value);
	});
});

describe('redactCaptureResult', () => {
	it('redacts the URLs of the event properties and of the person properties it sets', () => {
		const event = {
			uuid: 'e-1',
			event: '$pageview',
			properties: {
				$current_url: 'https://app.ever.team/auth/reset-password?token=live',
				$pathname: '/auth/reset-password',
				$referrer: '$direct',
				count: 2
			},
			$set: { $current_url: 'https://app.ever.team/auth/accept-invite?email=a%40b.c&code=1' },
			$set_once: { $initial_current_url: 'https://app.ever.team/verify-email?token=live' }
		} as unknown as CaptureResult;

		const sent = redactCaptureResult(event);

		expect(sent?.properties).toEqual({
			$current_url: 'https://app.ever.team/auth/reset-password?token=redacted',
			$pathname: '/auth/reset-password',
			$referrer: '$direct',
			count: 2
		});
		expect(sent?.$set).toEqual({
			$current_url: 'https://app.ever.team/auth/accept-invite?email=redacted&code=redacted'
		});
		expect(sent?.$set_once).toEqual({ $initial_current_url: 'https://app.ever.team/verify-email?token=redacted' });
	});

	it('passes a dropped event through', () => {
		expect(redactCaptureResult(null)).toBeNull();
	});
});
