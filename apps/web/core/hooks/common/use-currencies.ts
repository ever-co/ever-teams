'use client';
import { useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';
import { currenciesState } from '@/core/stores/common/currencies';
import { currencyService } from '@/core/services/client/api/currencies/currency.service';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { UseCurrenciesReturn } from '@/core/types/interfaces/common/currency';
import { useFirstLoad } from './use-first-load';

/**
 * Custom hook for managing application currencies with React Query integration
 *
 * This hook provides comprehensive currency management functionality including:
 * - Fetching available currencies from the API with caching
 * - Managing currency state with persistence
 * - Backward compatibility with existing Jotai state management
 * - Automatic filtering based on organization and tenant
 *
 * @description
 * The hook uses React Query for efficient data fetching and caching, while maintaining
 * compatibility with the existing Jotai state management system. It automatically
 * filters currencies based on the current organization and tenant context.
 *
 * @example
 * ```tsx
 * function CurrencySelector() {
 *   const {
 *     currencies,
 *     loading,
 *     error,
 *     getCurrencies
 *   } = useCurrencies();
 *
 *   if (loading) return <div>Loading currencies...</div>;
 *   if (error) return <div>Error loading currencies</div>;
 *
 *   return (
 *     <select>
 *       {currencies.map(currency => (
 *         <option key={currency.id} value={currency.isoCode}>
 *           {currency.currency} ({currency.isoCode})
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 *
 * @returns {UseCurrenciesReturn} Object containing currency management functions and state
 *
 * @since 1.0.0
 * @version 2.0.0 - Added React Query integration
 *
 * @see {@link https://tanstack.com/query/latest} React Query Documentation
 *
 * @throws {Error} When currency API request fails
 * @throws {ZodValidationError} When API response doesn't match expected schema
 */
export const useCurrencies = (): UseCurrenciesReturn => {
	const [currencies, setCurrencies] = useAtom(currenciesState);
	const { firstLoadData } = useFirstLoad();

	/**
	 * React Query for currencies data with optimized caching strategy
	 *
	 * @description
	 * - Uses dynamic query key based on organization and tenant
	 * - Implements moderate caching (10 minutes stale time, 30 minutes cache time)
	 * - Only fetches when organization and tenant are available
	 */
	const currenciesQuery = useQuery({
		queryKey: queryKeys.currencies.byOrganization(getTenantIdCookie() || '', getOrganizationIdCookie() || ''),
		queryFn: currencyService.getCurrencies,
		enabled: !!(getTenantIdCookie() && getOrganizationIdCookie()),
		staleTime: 1000 * 60 * 10, // Currencies are relatively stable, cache for 10 minutes
		gcTime: 1000 * 60 * 30 // Keep in cache for 30 minutes
	});

	// Sync React Query data with Jotai state for backward compatibility
	useEffect(() => {
		if (currenciesQuery.data?.items) {
			// Cast to any for backward compatibility with existing interfaces
			const adaptedCurrencies = currenciesQuery.data.items.map((item) => ({
				id: item.id,
				isoCode: item.isoCode,
				currency: item.currency
			}));
			setCurrencies(adaptedCurrencies);
		}
	}, [currenciesQuery.data?.items, setCurrencies]);

	/**
	 * Manually fetch currencies data
	 * @returns Promise that resolves when data is fetched
	 */
	const getCurrencies = useCallback(async () => {
		await currenciesQuery.refetch();
	}, [currenciesQuery]);

	const handleFirstLoad = useCallback(async () => {
		// Only fetch if we don't have data and not currently fetching
		if (!currenciesQuery.data && currenciesQuery.fetchStatus !== 'fetching') {
			await currenciesQuery.refetch();
		}
		firstLoadData();
	}, [firstLoadData, currenciesQuery]);

	return {
		currencies,
		loading: currenciesQuery.isLoading,
		getCurrencies,
		firstLoadCurrenciesData: handleFirstLoad,
		error: currenciesQuery.error,
		isError: currenciesQuery.isError,
		refetch: currenciesQuery.refetch
	};
};
