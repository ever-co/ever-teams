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
import { useCallback, useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from './use-first-load';
import { useLanguage } from './use-language';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { languageService } from '@/core/services/client/api';
import { ILanguageItemList, UseLanguageSettingsReturn } from '@/core/types/interfaces/common/language';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { TLanguageItemList } from '@/core/types/schemas';
import { useUserLanguagePreference } from './use-user-language-preference';
import { useLanguageStateSync } from './use-language-state-sync';

/**
 * Filters languages based on APPLICATION_LANGUAGES_CODE configuration
 * @param data - The pagination response containing language items
 * @returns Filtered pagination response
 */
const filterLanguagesByCode = (data: PaginationResponse<TLanguageItemList>) => {
	const filteredLanguages = data.items.filter((item) => APPLICATION_LANGUAGES_CODE.includes(item.code));
	return { ...data, items: filteredLanguages };
};

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
	const [activeLanguageCode, setActiveLanguageCode] = useAtom(activeLanguageIdState);
	const [languagesFetching, setLanguagesFetching] = useAtom(languagesFetchingState);
	const { firstLoadData: firstLoadLanguagesData } = useFirstLoad();

	// Stable memoization of isSystem to prevent infinite API calls
	// Only recalculate when the actual role.isSystem value changes, not when user object changes
	const isSystem = useMemo(() => {
		return user?.role?.isSystem ?? false;
	}, [user?.role?.isSystem]); // Only depend on the specific property, not entire user object

	// Stable query key using memoized isSystem
	const queryKey = useMemo(() => {
		return queryKeys.languages.system(isSystem);
	}, [isSystem]); // Only changes when isSystem actually changes

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
		queryKey, // Use stable memoized query key
		queryFn: () => languageService.getLanguages(isSystem),
		enabled: !!user, // Only fetch when user is available
		staleTime: 1000 * 60 * 60, // Languages are stable, cache for 1 hour
		gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
		select: filterLanguagesByCode
	});
	const activeLanguageId = useMemo(() => getActiveLanguageIdCookie(), []);
	// Use custom hooks to reduce complexity
	useLanguageStateSync(languagesQuery, setLanguages, setLanguagesFetching);
	useUserLanguagePreference(user, changeLanguage);

	/**
	 * Loads languages data intelligently - uses cache if fresh, fetches if stale
	 * @returns Promise resolving to the API response data
	 */
	const loadLanguagesData = useCallback(async () => {
		setActiveLanguageCode(activeLanguageId);
		try {
			// SMART LOADING - Check cache first, only fetch if needed
			let result;

			// Check if we have fresh data in cache
			if (languagesQuery.data && !languagesQuery.isStale) {
				// Data is fresh, use cache
				result = { data: languagesQuery.data };
			} else {
				// Data is stale or missing, fetch from API
				const queryResult = await languagesQuery.refetch();
				result = queryResult;
			}

			// Return the data in the expected format with proper PaginationResponse structure
			return result.data ? { data: result.data } : { data: { items: [], total: 0 } };
		} catch (error) {
			// Fallback to cached data if available, even if stale
			if (languagesQuery.data) {
				return { data: languagesQuery.data };
			}
			return { data: { items: [], total: 0 } };
		}
	}, [languagesQuery.data, languagesQuery.isStale]);

	/**
	 * Sets the active language and persists the selection
	 * @param languageId - The language object to set as active
	 */
	const setActiveLanguage = useCallback(
		(languageId: ILanguageItemList) => {
			if (activeLanguageId !== languageId.code && languageId.code !== activeLanguageCode) {
				changeLanguage(languageId.code);
				setActiveLanguageIdCookie(languageId.code);
				setActiveLanguageCode(languageId.code);
			}
		},
		[activeLanguageId, activeLanguageCode, setActiveLanguageCode, changeLanguage]
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
