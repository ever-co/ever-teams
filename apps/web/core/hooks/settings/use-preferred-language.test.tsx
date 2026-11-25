/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';

const calls: string[] = [];
const mockReplace = jest.fn((path: string) => {
	calls.push(`replace ${path}`);
});
const mockUpdateAvatar = jest.fn(() => Promise.resolve());
const mockChangeLanguage = jest.fn();
const mockSetActiveLanguage = jest.fn();

jest.mock('next-intl', () => ({ useLocale: () => 'de' }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-1', preferredLanguage: 'de' } })
}));
jest.mock('@/core/hooks/users/use-settings', () => ({ useSettings: () => ({ updateAvatar: mockUpdateAvatar }) }));
jest.mock('@/core/hooks/common/use-language', () => ({ useLanguage: () => ({ changeLanguage: mockChangeLanguage }) }));
jest.mock('@/core/hooks/common/use-language-settings', () => ({
	useLanguageSettings: () => ({
		languages: [
			{ code: 'de', name: 'German' },
			{ code: 'fr', name: 'French' }
		],
		loading: false,
		languagesFetching: false,
		setActiveLanguage: mockSetActiveLanguage,
		isError: false,
		refetch: jest.fn()
	})
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	setActiveLanguageIdCookie: (code: string) => {
		calls.push(`app cookie ${code}`);
	},
	setRoutingLocaleCookie: (code: string) => {
		calls.push(`routing cookie ${code}`);
	}
}));

import { usePreferredLanguage } from './use-preferred-language';

/**
 * Priya picks French on a German page (#5735). The links of the app name no language and follow the routing cookie:
 * the pick must write it before the page moves, or the next link opens in German again.
 */
describe('usePreferredLanguage, a language picked', () => {
	beforeEach(() => {
		calls.length = 0;
		jest.clearAllMocks();
	});

	it('writes the routing cookie with the language picked, before the page moves to it', () => {
		const { result } = renderHook(() => usePreferredLanguage());

		act(() => result.current.changeTo('fr'));

		const routingCookieAt = calls.indexOf('routing cookie fr');
		const moveAt = calls.indexOf('replace /fr/settings/personal/preferences');
		expect(routingCookieAt).toBeGreaterThanOrEqual(0);
		expect(moveAt).toBeGreaterThan(routingCookieAt);
	});

	it('still saves the language to the account and to the app', () => {
		const { result } = renderHook(() => usePreferredLanguage());

		act(() => result.current.changeTo('fr'));

		expect(calls).toContain('app cookie fr');
		expect(mockChangeLanguage).toHaveBeenCalledWith('fr');
		expect(mockUpdateAvatar).toHaveBeenCalledWith({ preferredLanguage: 'fr', id: 'user-1' });
	});

	it('writes nothing for a language the app does not offer', () => {
		const { result } = renderHook(() => usePreferredLanguage());

		act(() => result.current.changeTo('xx'));

		expect(calls).toEqual([]);
	});
});
