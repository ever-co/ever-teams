import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { currenciesState } from '@/core/stores/common/currencies';
import { currencyService } from '@/core/services/client/api/currencies/currency.service';
import { useQuery } from './use-query';

export const useCurrencies = () => {
	const [currencies, setCurrencies] = useAtom(currenciesState);

	const { loading, queryCall: getCurrenciesQueryCall } = useQuery(currencyService.getCurrencies);

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
