/** @jest-environment jsdom */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { DemoBanner, demoSignUpUrl } from './demo-banner';

const mockConfig = { demo: false };
const mockRuntimeEnv: Record<string, string | undefined> = {};

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('@/env-config', () => ({
	readRuntimeEnv: (name: string) => mockRuntimeEnv[name]
}));
jest.mock('@/core/constants/config/constants', () => ({
	// A trailing slash, as an operator may write it: the link must not get a double slash.
	APP_LINK: 'https://app.ever.team/',
	get IS_DEMO_MODE() {
		return mockConfig.demo;
	}
}));

describe('DemoBanner', () => {
	// The build-time fallback reads process.env too: a value in the shell running the tests must not leak in.
	const originalProcessValue = process.env.NEXT_PUBLIC_DEMO_SIGN_UP_URL;

	beforeEach(() => {
		delete process.env.NEXT_PUBLIC_DEMO_SIGN_UP_URL;
	});

	afterEach(() => {
		delete mockRuntimeEnv.NEXT_PUBLIC_DEMO_SIGN_UP_URL;
		jest.restoreAllMocks();
	});

	afterAll(() => {
		if (originalProcessValue === undefined) {
			delete process.env.NEXT_PUBLIC_DEMO_SIGN_UP_URL;
		} else {
			process.env.NEXT_PUBLIC_DEMO_SIGN_UP_URL = originalProcessValue;
		}
	});

	it('renders nothing outside a demo deployment', () => {
		mockConfig.demo = false;

		const { container } = render(<DemoBanner />);

		expect(container.innerHTML).toBe('');
		expect(screen.queryByTestId('demo-banner')).toBeNull();
	});

	it('shows the demo notice and links to the hosted sign-up page on a demo deployment', () => {
		mockConfig.demo = true;

		render(<DemoBanner />);

		expect(screen.getByTestId('demo-banner')).toBeTruthy();
		expect(screen.getByText('common.DEMO_BANNER_TEXT')).toBeTruthy();
		const link = screen.getByRole('link', { name: 'common.DEMO_BANNER_SIGN_UP' });
		expect(link.getAttribute('href')).toBe('https://app.ever.team/auth/signup');
		expect(demoSignUpUrl()).toBe('https://app.ever.team/auth/signup');
	});

	it('links to NEXT_PUBLIC_DEMO_SIGN_UP_URL when the deployment names one (APP_LINK may be the demo itself)', () => {
		mockConfig.demo = true;
		mockRuntimeEnv.NEXT_PUBLIC_DEMO_SIGN_UP_URL = ' https://teams.example.com/auth/signup ';

		render(<DemoBanner />);

		const link = screen.getByRole('link', { name: 'common.DEMO_BANNER_SIGN_UP' });
		expect(link.getAttribute('href')).toBe('https://teams.example.com/auth/signup');
	});

	it('links to the normalised URL when the configured one omits the slashes after the scheme', () => {
		mockConfig.demo = true;
		// The URL parser accepts this form, but as an href on an https page it is a path on the demo itself
		mockRuntimeEnv.NEXT_PUBLIC_DEMO_SIGN_UP_URL = 'https:teams.example.com/auth/signup';

		render(<DemoBanner />);

		const link = screen.getByRole('link', { name: 'common.DEMO_BANNER_SIGN_UP' });
		expect(link.getAttribute('href')).toBe('https://teams.example.com/auth/signup');
	});

	it('ignores a NEXT_PUBLIC_DEMO_SIGN_UP_URL that is not an absolute http(s) URL, with one warning', () => {
		mockConfig.demo = true;
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

		for (const value of ['teams.example.com/auth/signup', '/auth/signup', 'javascript:alert(1)']) {
			mockRuntimeEnv.NEXT_PUBLIC_DEMO_SIGN_UP_URL = value;
			expect([value, demoSignUpUrl()]).toEqual([value, 'https://app.ever.team/auth/signup']);
		}
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it('has its two strings in every locale (next-intl has no English fallback here)', () => {
		const dir = join(__dirname, '../../../../locales');
		const locales = readdirSync(dir).filter((file) => file.endsWith('.json'));

		expect(locales.length).toBeGreaterThan(1);
		for (const file of locales) {
			const messages = JSON.parse(readFileSync(join(dir, file), 'utf8'));
			expect([file, typeof messages.common?.DEMO_BANNER_TEXT]).toEqual([file, 'string']);
			expect([file, typeof messages.common?.DEMO_BANNER_SIGN_UP]).toEqual([file, 'string']);
			expect([file, messages.common.DEMO_BANNER_TEXT.trim().length > 0]).toEqual([file, true]);
			expect([file, messages.common.DEMO_BANNER_SIGN_UP.trim().length > 0]).toEqual([file, true]);
		}
	});
});
