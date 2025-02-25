import { ICurrency, PaginationResponse } from '@app/interfaces';
import { get } from '../axios';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/app/helpers';
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
