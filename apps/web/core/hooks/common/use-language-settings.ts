'use client';
import { APPLICATION_LANGUAGES_CODE } from '@/core/constants/config/constants';
import { getActiveLanguageIdCookie, setActiveLanguageIdCookie } from '@/core/lib/helpers/cookies';
import {
	activeLanguageIdState,
	activeLanguageState,
	languageListState,
	languagesFetchingState,
	userState
} from '@/core/stores';
import { useCallback, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from './use-first-load';
import { useLanguage } from './use-language';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { languageService } from '@/core/services/client/api';
import { ILanguageItemList, UseLanguageSettingsReturn } from '@/core/types/interfaces/common/language';

/**
 * Custom hook for managing application language settings with React Query integration
 *
 * This hook provides comprehensive language management functionality including:
 * - Fetching available languages from the API with caching
 * - Managing active language state with persistence
 * - Filtering languages based on APPLICATION_LANGUAGES_CODE
 * - Backward compatibility with existing Jotai state management
 * - Automatic synchronization with user preferences and localStorage
 *
 * @description
 * The hook uses React Query for efficient data fetching and caching, while maintaining
 * compatibility with the existing Jotai state management system. It automatically
 * filters languages based on the APPLICATION_LANGUAGES_CODE configuration and
 * provides both loading states and error handling.
 *
 * @example
 * ```tsx
 * function LanguageSelector() {
 *   const {
 *     languages,
 *     loading,
 *     activeLanguage,
 *     setActiveLanguage,
 *     error
 *   } = useLanguageSettings();
 *
 *   if (loading) return <div>Loading languages...</div>;
 *   if (error) return <div>Error loading languages</div>;
 *
 *   return (
 *     <select
 *       value={activeLanguage?.code || ''}
 *       onChange={(e) => {
 *         const lang = languages.find(l => l.code === e.target.value);
 *         if (lang) setActiveLanguage(lang);
 *       }}
 *     >
 *       {languages.map(lang => (
 *         <option key={lang.id} value={lang.code}>
 *           {lang.name}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 *
 * @returns {UseLanguageSettingsReturn} Object containing language management functions and state
 *
 * @since 1.0.0
 * @version 2.0.0 - Added React Query integration
 *
 * @see {@link https://tanstack.com/query/latest} React Query Documentation
 * @see {@link APPLICATION_LANGUAGES_CODE} Supported language codes
 *
 * @throws {Error} When language API request fails
 * @throws {ZodValidationError} When API response doesn't match expected schema
 */
export function useLanguageSettings(): UseLanguageSettingsReturn {
	const [user] = useAtom(userState);
	const [languages, setLanguages] = useAtom(languageListState);
	const { changeLanguage } = useLanguage();
	const activeLanguage = useAtomValue(activeLanguageState);
	const [, setActiveLanguageId] = useAtom(activeLanguageIdState);
	const [languagesFetching, setLanguagesFetching] = useAtom(languagesFetchingState);
	const { firstLoadData: firstLoadLanguagesData } = useFirstLoad();

	/**
	 * React Query for languages data with optimized caching strategy
	 *
	 * @description
	 * - Uses dynamic query key based on user's system role
	 * - Implements aggressive caching (1 hour stale time, 24 hours cache time)
	 * - Automatically filters languages by APPLICATION_LANGUAGES_CODE
	 * - Only fetches when user is authenticated
	 */
	const languagesQuery = useQuery({
		queryKey: queryKeys.languages.system(user?.role?.isSystem ?? false),
		queryFn: () => languageService.getLanguages(user?.role?.isSystem ?? false),
		enabled: !!user, // Only fetch when user is available
		staleTime: 1000 * 60 * 60, // Languages are stable, cache for 1 hour
		gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
		select: (data) => {
			// Filter languages based on APPLICATION_LANGUAGES_CODE
			const filteredLanguages = data.items.filter((item) => APPLICATION_LANGUAGES_CODE.includes(item.code));
			return { ...data, items: filteredLanguages };
		}
	});

	// Sync React Query loading state with Jotai state for backward compatibility
	useEffect(() => {
		setLanguagesFetching(languagesQuery.isLoading);
	}, [languagesQuery.isLoading, setLanguagesFetching]);

	// Sync React Query data with Jotai state for backward compatibility
	useEffect(() => {
		if (languagesQuery.data?.items) {
			// Cast to the expected type for backward compatibility
			setLanguages(languagesQuery.data.items as any);
		}
	}, [languagesQuery.data?.items, setLanguages]);

	// Update language in rerender
	useEffect(() => {
		const language = user?.preferredLanguage || window.localStorage.getItem('preferredLanguage');
		if (language) {
			changeLanguage(language);
		}
	}, [changeLanguage, user]);

	/**
	 * Loads languages data from the API and updates the active language ID cookie
	 * @returns Promise resolving to the API response data
	 */
	const loadLanguagesData = useCallback(() => {
		setActiveLanguageId(getActiveLanguageIdCookie());
		// Trigger a refetch of the React Query data
		return languagesQuery.refetch().then((result) => {
			// Return the data in the expected format for backward compatibility
			return result.data ? { data: result.data } : { data: { items: [] } };
		});
	}, [languagesQuery, setActiveLanguageId]);

	/**
	 * Sets the active language and persists the selection
	 * @param languageId - The language object to set as active
	 */
	const setActiveLanguage = useCallback(
		(languageId: ILanguageItemList) => {
			changeLanguage(languageId.code);
			setActiveLanguageIdCookie(languageId.code);
			setActiveLanguageId(languageId.code);
		},
		[setActiveLanguageId, changeLanguage]
	);

	return {
		loadLanguagesData,
		loading: languagesQuery.isLoading,
		languages,
		languagesFetching,
		activeLanguage,
		setActiveLanguage,
		firstLoadLanguagesData,
		// Additional React Query states for advanced usage
		error: languagesQuery.error,
		isError: languagesQuery.isError,
		refetch: languagesQuery.refetch
	};
}
