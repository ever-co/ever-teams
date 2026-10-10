import { ICurrency } from '@/core/types/interfaces/common/currency';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { serverFetch } from '../fetch';

export function getCurrenciesRequest({ bearer_token, tenantId }: { bearer_token: string; tenantId: string }) {
	return serverFetch<PaginationResponse<ICurrency>>({
		path: '/currency',
		method: 'GET',
		bearer_token,
		tenantId
	});
}
