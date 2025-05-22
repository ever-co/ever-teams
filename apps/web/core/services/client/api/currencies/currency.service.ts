import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '../../api.service';
import qs from 'qs';
import { ICurrency, PaginationResponse } from '@/core/types/interfaces/to-review';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class CurrencyService extends APIService {
	getCurrencies = async () => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		const obj = {
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId
		} as Record<string, string>;

		const query = qs.stringify(obj);

		return this.get<PaginationResponse<ICurrency>>(`/currency?${query}`);
	};
}

export const currencyService = new CurrencyService(GAUZY_API_BASE_SERVER_URL.value);
