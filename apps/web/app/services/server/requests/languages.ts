import { ILanguageItemList, PaginationResponse } from '@app/interfaces';
import { serverFetch } from '../fetch';

export function getLanguageListRequest(
	{ is_system, tenantId }: { is_system: boolean; tenantId: string },
	bearer_token: string
) {
	// const init = {};
	return serverFetch<PaginationResponse<ILanguageItemList>>({
		path: `/languages?is_system=${is_system}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
