import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';
import { currenciesState } from '@/core/stores/currencies';
import { getCurrenciesAPI } from '@/core/services/client/api';

export const useCurrencies = () => {
	const [currencies, setCurrencies] = useAtom(currenciesState);

	const { loading, queryCall: getCurrenciesQueryCall } = useQuery(getCurrenciesAPI);

	const getCurrencies = useCallback(() => {
		getCurrenciesQueryCall().then((response) => {
			if (response?.data?.items?.length) {
				setCurrencies(response.data.items);
			}
		});
	}, [getCurrenciesQueryCall, setCurrencies]);

	return {
		currencies,
		loading,
		getCurrencies
	};
};
