/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('@/core/constants/config/constants', () => ({
	APP_LINK: 'https://app.example.com',
	IS_DEMO_MODE: true
}));
// The two collaborators of getPublicRuntimeEnv that are not about this key
jest.mock('@/core/services/server/requests/desktop-source', () => ({
	getDesktopConfig: () => ({})
}));
jest.mock('@/core/lib/utils/check-provider-env-vars', () => ({
	getConfiguredAuthProviderIds: () => []
}));

const KEY = 'NEXT_PUBLIC_DEMO_SIGN_UP_URL';

/**
 * The configured sign-up URL end to end, with the real runtime env: the server's getPublicRuntimeEnv() publishes it
 * on <html> (as app/[locale]/layout.tsx does), and the banner reads it in the browser through the real
 * readRuntimeEnv, with nothing left in process.env for the build-time fallback to find.
 */
describe('DemoBanner sign-up URL through the runtime env', () => {
	const original = process.env[KEY];

	afterEach(() => {
		document.documentElement.removeAttribute('data-ever-teams-runtime-env');
		delete (globalThis as Record<string, unknown>).__EVER_TEAMS_RUNTIME_ENV__;
		if (original === undefined) {
			delete process.env[KEY];
		} else {
			process.env[KEY] = original;
		}
	});

	it('links to the URL the server published', () => {
		// require() inside jest.isolateModules: each module is loaded fresh, after process.env is set for this test.
		jest.isolateModules(() => {
			process.env[KEY] = 'https://teams.example.com/auth/signup';
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { getPublicRuntimeEnv } = require('@/core/services/server/runtime-env');
			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { RUNTIME_ENV_ATTRIBUTE, serializeRuntimeEnvAttribute } = require('@/env-config');
			const published = getPublicRuntimeEnv();
			expect(published[KEY]).toBe('https://teams.example.com/auth/signup');

			document.documentElement.setAttribute(RUNTIME_ENV_ATTRIBUTE, serializeRuntimeEnvAttribute(published));
			delete process.env[KEY];

			// eslint-disable-next-line @typescript-eslint/no-require-imports
			const { DemoBanner } = require('./demo-banner');
			render(<DemoBanner />);
		});

		const link = screen.getByRole('link', { name: 'common.DEMO_BANNER_SIGN_UP' });
		expect(link.getAttribute('href')).toBe('https://teams.example.com/auth/signup');
	});
});
