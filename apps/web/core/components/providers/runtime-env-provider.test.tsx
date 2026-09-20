/**
 * useRuntimeEnvValue() must give the same answer during SSR as in the browser, or components that
 * depend on it (social-login buttons) would not hydrate. On the server it therefore reads the
 * provider's env (the request's payload), not process.env — derived keys such as
 * EVER_TEAMS_AUTH_PROVIDERS only exist in the payload.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { RuntimeEnvProvider, useRuntimeEnvValue } from './runtime-env-provider';

const ORIGINAL_ENV = process.env;

function Probe({ name }: Readonly<{ name: string }>) {
	return <output>{JSON.stringify(useRuntimeEnvValue(name) ?? null)}</output>;
}

function renderValue(name: string, env?: Record<string, string>): unknown {
	const probe = <Probe name={name} />;
	const html = renderToString(env ? <RuntimeEnvProvider env={env}>{probe}</RuntimeEnvProvider> : probe);
	const json = /<output>(.*)<\/output>/.exec(html)?.[1] ?? '';
	return JSON.parse(json.replace(/&quot;/g, '"'));
}

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV };
	delete process.env.EVER_TEAMS_AUTH_PROVIDERS;
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
});

describe('useRuntimeEnvValue (server render)', () => {
	it('reads the request payload, including keys derived on the server', () => {
		process.env.NEXT_PUBLIC_CAPTCHA_TYPE = 'recaptcha';

		expect(renderValue('EVER_TEAMS_AUTH_PROVIDERS', { EVER_TEAMS_AUTH_PROVIDERS: 'google' })).toBe('google');
		expect(renderValue('NEXT_PUBLIC_CAPTCHA_TYPE', { NEXT_PUBLIC_CAPTCHA_TYPE: 'hcaptcha' })).toBe('hcaptcha');
		expect(renderValue('NEXT_PUBLIC_CAPTCHA_TYPE', {})).toBeNull();
	});

	it('treats a whitespace-only value as empty, like readRuntimeEnv', () => {
		expect(renderValue('NEXT_PUBLIC_MEET_TYPE', { NEXT_PUBLIC_MEET_TYPE: '  ' })).toBe('');
	});

	it('falls back to readRuntimeEnv outside the provider', () => {
		process.env.NEXT_PUBLIC_CAPTCHA_TYPE = 'recaptcha';

		expect(renderValue('NEXT_PUBLIC_CAPTCHA_TYPE')).toBe('recaptcha');
	});
});
