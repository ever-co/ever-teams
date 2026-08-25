/** @jest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

const mockGetLanguages = jest.fn(async () => ({ items: [], total: 0 }));
const mockIsCurrentScope = jest.fn(() => true);

jest.mock('@/core/constants/config/constants', () => ({
	APPLICATION_LANGUAGES_CODE: ['en'],
	FAST_APP_BOOTSTRAP: { value: true }
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	getActiveLanguageIdCookie: () => 'en',
	setActiveLanguageIdCookie: jest.fn()
}));
jest.mock('@/core/stores', () => {
	const { atom } = jest.requireActual('jotai') as typeof import('jotai');
	return {
		activeLanguageIdState: atom(''),
		activeLanguageState: atom(null),
		languageListState: atom([]),
		languagesFetchingState: atom(false)
	};
});
jest.mock('./use-first-load', () => ({ useFirstLoad: () => ({ firstLoadData: jest.fn() }) }));
jest.mock('./use-language', () => ({ useLanguage: () => ({ changeLanguage: jest.fn() }) }));
jest.mock('./use-language-state-sync', () => ({ useLanguageStateSync: jest.fn() }));
jest.mock('./use-user-language-preference', () => ({ useUserLanguagePreference: jest.fn() }));
jest.mock('../queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-1', tenantId: 'tenant-1', role: { isSystem: false } } })
}));
jest.mock('../bootstrap/use-fast-scope-guard', () => ({ useFastScopeGuard: () => mockIsCurrentScope }));
jest.mock('../auth/use-reactive-access-token-cookie', () => ({ useReactiveAccessTokenCookie: () => null }));
jest.mock('@/core/services/client/api', () => ({
	languageService: { getLanguages: () => mockGetLanguages() }
}));

import { useLanguageSettings } from './use-language-settings';

describe('useLanguageSettings fast readiness', () => {
	beforeEach(() => mockGetLanguages.mockClear());

	it('does not manually refetch before the credential scope has an access token', async () => {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const wrapper = ({ children }: PropsWithChildren) => (
			<Provider>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			</Provider>
		);
		const { result } = renderHook(() => useLanguageSettings(), { wrapper });

		let response: Awaited<ReturnType<typeof result.current.loadLanguagesData>> | undefined;
		await act(async () => {
			response = await result.current.loadLanguagesData();
		});

		expect(mockGetLanguages).not.toHaveBeenCalled();
		expect(response).toEqual({ data: { items: [], total: 0 } });
		queryClient.clear();
	});
});
