import { ICurrency, PaginationResponse } from '@/core/types/interfaces';
import { get } from '../axios';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/index';
import qs from 'qs';

export function getCurrenciesAPI() {
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();

	const obj = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId
	} as Record<string, string>;

	const query = qs.stringify(obj);

	return get<PaginationResponse<ICurrency>>(`/currency?${query}`);
}
