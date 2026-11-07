/** @jest-environment jsdom */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { DemoBanner, DEMO_SIGN_UP_URL } from './demo-banner';

const mockConfig = { demo: false };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('@/core/constants/config/constants', () => ({
	// A trailing slash, as an operator may write it: the link must not get a double slash.
	APP_LINK: 'https://app.ever.team/',
	get IS_DEMO_MODE() {
		return mockConfig.demo;
	}
}));

describe('DemoBanner', () => {
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
		expect(DEMO_SIGN_UP_URL).toBe('https://app.ever.team/auth/signup');
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
