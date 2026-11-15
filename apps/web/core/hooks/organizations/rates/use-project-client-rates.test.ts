import type { UseQueryResult } from '@tanstack/react-query';
import type { TProjectRates } from '@/core/types/schemas/organization/rates.schema';
import { projectRatesStatesOf } from './use-project-client-rates';

const RATES: TProjectRates = { id: 'website', billRateValue: 90, currency: 'EUR', members: [] };

function resultOf(data: TProjectRates | undefined, error: unknown): UseQueryResult<TProjectRates> {
	return {
		data,
		error,
		isError: error !== null,
		isLoading: false,
		isFetching: false
	} as UseQueryResult<TProjectRates>;
}

describe('projectRatesStatesOf', () => {
	it('keeps the rates a read returned', () => {
		const [state] = projectRatesStatesOf([resultOf(RATES, null)]);

		expect(state).toEqual({ rates: RATES, isLoading: false, isRefreshing: false, hasFailed: false });
	});

	it('drops rates read earlier once the API refuses or stops serving them, without calling it a failure', () => {
		const refused = Object.assign(new Error('Forbidden'), { statusCode: 403 });
		const missing = Object.assign(new Error('Not Found'), { statusCode: 404 });

		const states = projectRatesStatesOf([resultOf(RATES, refused), resultOf(RATES, missing)]);

		expect(states.map((state) => state.rates)).toEqual([null, null]);
		expect(states.map((state) => state.hasFailed)).toEqual([false, false]);
	});

	it('keeps the last rates through another failure, which it reports', () => {
		const outage = Object.assign(new Error('Bad Gateway'), { statusCode: 502 });

		const [state] = projectRatesStatesOf([resultOf(RATES, outage)]);

		expect(state.rates).toEqual(RATES);
		expect(state.hasFailed).toBe(true);
	});
});
