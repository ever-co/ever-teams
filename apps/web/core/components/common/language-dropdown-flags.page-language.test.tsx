/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { LanguageDropDownWithFlags } from './language-dropdown-flags';

const page = { pathname: '/auth/passcode' };
const loaded = { languages: [] as Array<{ code: string; name: string }> };

jest.mock('next/navigation', () => ({
	usePathname: () => page.pathname,
	useRouter: () => ({ replace: jest.fn() })
}));
jest.mock('@/core/hooks/common/use-language', () => ({
	useLanguage: () => ({ changeLanguage: jest.fn() })
}));
jest.mock('@/core/hooks/common/use-language-settings', () => ({
	useLanguageSettings: () => ({
		languages: loaded.languages,
		loadLanguagesData: jest.fn(),
		setActiveLanguage: jest.fn(),
		loading: false,
		isError: false,
		refetch: jest.fn()
	})
}));

/** The sign-in pages' menu: its list of languages loads only when it is opened. */
function renderClosedMenu(pathname: string) {
	page.pathname = pathname;
	render(<LanguageDropDownWithFlags deferLoading showFlag={false} />);
}

describe('LanguageDropDownWithFlags, closed and not opened yet (#5692)', () => {
	afterEach(() => {
		loaded.languages = [];
	});

	it.each([
		['/de/auth/passcode', 'German'],
		['/ar/auth/passcode', 'Arabic'],
		['/auth/passcode', 'English']
	])('names the language of %s: %s', (pathname, name) => {
		renderClosedMenu(pathname);

		expect(screen.getByText(name)).toBeTruthy();
	});

	it('names the language as the list names it, once the list is loaded', () => {
		loaded.languages = [{ code: 'de', name: 'Deutsch' }];

		renderClosedMenu('/de/auth/passcode');

		expect(screen.getByText('Deutsch')).toBeTruthy();
		expect(screen.queryByText('German')).toBeNull();
	});
});
