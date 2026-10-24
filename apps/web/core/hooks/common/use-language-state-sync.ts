import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { ILanguageItemList } from '@/core/types/interfaces/common/language';
import { TLanguageItemList } from '@/core/types/schemas';
import { UseQueryResult } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

const alwaysCurrentScope = () => true;
type LoadingSetter = (loading: boolean) => void;
const loadingOwners = new Set<symbol>();

const updateLoadingOwnership = (setter: LoadingSetter, owner: symbol, loading: boolean) => {
	if (loading) loadingOwners.add(owner);
	else loadingOwners.delete(owner);
	setter(loadingOwners.size > 0);
};

/**
 * Custom hook to sync React Query state with Jotai atoms for backward compatibility
 * @param languagesQuery - The React Query result
 * @param setLanguages - Jotai setter for languages
 * @param setLanguagesFetching - Jotai setter for loading state
 */
export const useLanguageStateSync = (
	languagesQuery: UseQueryResult<PaginationResponse<TLanguageItemList>, Error>,
	setLanguages: (languages: ILanguageItemList[]) => void,
	setLanguagesFetching: (loading: boolean) => void,
	options: { enabled?: boolean; isCurrentScope?: () => boolean } = {}
) => {
	const { enabled = true } = options;
	const isCurrentScope = options.isCurrentScope ?? alwaysCurrentScope;
	const loadingOwner = useRef(Symbol('language-loading-owner'));
	// Sync React Query loading state with Jotai state for backward compatibility
	useEffect(() => {
		updateLoadingOwnership(
			setLanguagesFetching,
			loadingOwner.current,
			enabled && isCurrentScope() && languagesQuery.isLoading
		);
		return () => updateLoadingOwnership(setLanguagesFetching, loadingOwner.current, false);
	}, [enabled, isCurrentScope, languagesQuery.isLoading, setLanguagesFetching]);

	// Sync React Query data with Jotai state for backward compatibility
	useEffect(() => {
		if (enabled && isCurrentScope() && languagesQuery.data?.items) {
			// Cast to the expected type for backward compatibility
			setLanguages(languagesQuery.data.items as unknown as ILanguageItemList[]);
		}
	}, [enabled, isCurrentScope, languagesQuery.data?.items, setLanguages]);
};
