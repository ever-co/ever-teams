/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Footer } from './footer';

const mockUseAppVersionQuery = jest.fn();
const mockUseTranslations = jest.fn();
const originalProcessEnv = process.env;

jest.mock('@/core/hooks/common/use-app-version-query', () => ({
	useAppVersionQuery: () => mockUseAppVersionQuery()
}));

jest.mock('jotai', () => ({
	atom: () => Symbol('atom'),
	useAtomValue: () => false
}));

jest.mock('next-intl', () => ({
	useTranslations: (...args: unknown[]) => {
		mockUseTranslations(...args);
		return (key: string, values?: Record<string, string>) => {
			if (key === 'layout.footer.BUILD_WEB') return `Build Web v${values?.version}`;
			if (key === 'layout.footer.API_VERSION') return `API v${values?.version}`;
			if (key === 'layout.footer.OPEN_COMMIT') return `Open commit ${values?.commit}`;
			return key;
		};
	}
}));

jest.mock('@/core/constants/config/constants', () => ({
	APP_LINK: 'https://ever.team',
	APP_NAME: 'Ever Teams',
	CHATWOOT_API_KEY: { value: '' },
	COMPANY_LINK: 'https://ever.co',
	COMPANY_NAME: 'Ever Co. LTD'
}));

jest.mock('@/core/components', () => ({
	Text: {
		Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
	},
	ThemeToggler: () => null
}));

jest.mock('@/core/components/common/language-dropdown-flags', () => ({
	LanguageDropDownWithFlags: () => null
}));

describe('Footer build identity', () => {
	beforeEach(() => {
		process.env = {
			...originalProcessEnv,
			NEXT_PUBLIC_BUILD_VERSION: '0.1.0',
			NEXT_PUBLIC_BUILD_SHA: 'b9316faee8735d1ee3d8acedde19980fd7f75f9e'
		};
		mockUseAppVersionQuery.mockReturnValue({
			data: {
				name: 'api',
				version: '0.1.0',
				commit: '63cb7a951107b2ab44d98617358c682bf9560eb8'
			}
		});
	});

	afterEach(() => {
		process.env = originalProcessEnv;
	});

	it('shows linked Web and API build versions on the copyright line', () => {
		render(<Footer />);

		expect(mockUseTranslations).toHaveBeenCalledWith();
		expect(
			screen.getByText(
				(_content, element) =>
					element?.tagName === 'SPAN' &&
					element.textContent === 'Build Web v0.1.0 · b9316fa · API v0.1.0 · 63cb7a9'
			)
		).toBeTruthy();
		expect(screen.getByRole('link', { name: 'b9316fa' }).getAttribute('href')).toBe(
			'https://github.com/ever-co/ever-teams/commit/b9316faee8735d1ee3d8acedde19980fd7f75f9e'
		);
		expect(screen.getByRole('link', { name: '63cb7a9' }).getAttribute('href')).toBe(
			'https://github.com/ever-co/ever-gauzy/commit/63cb7a951107b2ab44d98617358c682bf9560eb8'
		);
	});

	it('keeps the Web build visible when API build metadata is unavailable', () => {
		mockUseAppVersionQuery.mockReturnValue({ data: undefined });

		render(<Footer />);

		expect(
			screen.getByText(
				(_content, element) =>
					element?.tagName === 'SPAN' && element.textContent === 'Build Web v0.1.0 · b9316fa'
			)
		).toBeTruthy();
		expect(screen.queryByText(/API v/)).toBeNull();
	});
});
