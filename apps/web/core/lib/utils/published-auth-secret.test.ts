/**
 * `apps/web/.env` is in git and sets AUTH_SECRET=ever-app-auth-secret, and Next.js loads that file in production too:
 * a deployment built from the repository without an AUTH_SECRET of its own signed next-auth's cookies with a value
 * anyone can read. Outside `next dev` a published value now counts as unset, and the production start-up removes it
 * from the environment, which next-auth reads by itself when it is given no secret.
 */
import { developmentAuthSecret, PUBLISHED_AUTH_SECRETS, resolveAuthSecret } from '@/core/constants/config/constants';
import { dropPublishedAuthSecret } from './published-auth-secret';
import { captureConsole } from '@/test/server-logs';

describe('resolveAuthSecret', () => {
	it.each(PUBLISHED_AUTH_SECRETS)('ignores the published %s outside `next dev`', (published) => {
		expect(resolveAuthSecret(published, false)).toBeUndefined();
		expect(resolveAuthSecret(` ${published} `, false)).toBeUndefined();
	});

	it('keeps a published value in `next dev`, where it is the documented local secret', () => {
		expect(resolveAuthSecret('ever-app-auth-secret', true)).toBe('ever-app-auth-secret');
	});

	it('uses any other secret as written', () => {
		expect(resolveAuthSecret('a-real-secret', false)).toBe('a-real-secret');
		expect(resolveAuthSecret('ever-app-auth-secret-of-my-own', false)).toBe('ever-app-auth-secret-of-my-own');
	});

	it('falls back to the built-in secret in `next dev` only', () => {
		expect(resolveAuthSecret('  ', true)).toBe(developmentAuthSecret);
		expect(resolveAuthSecret(undefined, false)).toBeUndefined();
	});
});

describe('dropPublishedAuthSecret', () => {
	afterEach(() => jest.restoreAllMocks());

	it.each(PUBLISHED_AUTH_SECRETS)('removes the published %s from the environment, and says why', (published) => {
		const env: Record<string, string | undefined> = { AUTH_SECRET: published, OTHER: 'kept' };
		const logs = captureConsole();

		expect(dropPublishedAuthSecret(env)).toBe(true);

		expect(env).toEqual({ OTHER: 'kept' });
		expect(logs.text()).toContain('AUTH_SECRET is the public value');
		expect(logs.text()).not.toContain(published);
	});

	it('leaves an AUTH_SECRET of the deployment, and an unset one, alone', () => {
		const own: Record<string, string | undefined> = { AUTH_SECRET: 'a-real-secret' };
		const unset: Record<string, string | undefined> = {};

		expect(dropPublishedAuthSecret(own)).toBe(false);
		expect(dropPublishedAuthSecret(unset)).toBe(false);
		expect(own).toEqual({ AUTH_SECRET: 'a-real-secret' });
	});
});
