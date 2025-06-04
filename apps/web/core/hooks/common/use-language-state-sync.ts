import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { ILanguageItemList } from '@/core/types/interfaces/common/language';
import { TLanguageItemList } from '@/core/types/schemas';
import { UseQueryResult } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Custom hook to sync React Query state with Jotai atoms for backward compatibility
 * @param languagesQuery - The React Query result
 * @param setLanguages - Jotai setter for languages
 * @param setLanguagesFetching - Jotai setter for loading state
 */
export const useLanguageStateSync = (
	languagesQuery: UseQueryResult<PaginationResponse<TLanguageItemList>, Error>,
	setLanguages: (languages: ILanguageItemList[]) => void,
	setLanguagesFetching: (loading: boolean) => void
) => {
	// Sync React Query loading state with Jotai state for backward compatibility
	useEffect(() => {
		setLanguagesFetching(languagesQuery.isLoading);
	}, [languagesQuery.isLoading, setLanguagesFetching]);

	// Sync React Query data with Jotai state for backward compatibility
	useEffect(() => {
		if (languagesQuery.data?.items) {
			// Cast to the expected type for backward compatibility
			setLanguages(languagesQuery.data.items as unknown as ILanguageItemList[]);
		}
	}, [languagesQuery.data?.items, setLanguages]);
};
