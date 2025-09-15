import { UseQueryResult } from '@tanstack/react-query';
import { IBaseEntity } from './base-interfaces';
import { PaginationResponse } from './data-response';
import { TCurrencyList } from '../../schemas';

export interface ICurrency extends IBaseEntity {
	isoCode: string;
	currency: string;
}

/**
 * Currencies hook return type
 * @interface UseCurrenciesReturn
 */
export interface UseCurrenciesReturn {
	/** Array of available currencies */
	currencies: ICurrency[];
	/** Loading state for the currencies query */
	loading: boolean;
	/** Function to manually fetch currencies data */
	getCurrencies: () => Promise<void>;
	/** First load data function for backward compatibility */
	firstLoadCurrenciesData: () => void;
	/** Error object from React Query if the request failed */
	error: Error | null;
	/** Boolean indicating if there's an error */
	isError: boolean;
	/** Function to manually refetch currencies data */
	refetch: UseQueryResult<PaginationResponse<TCurrencyList>, Error>['refetch'];
}
