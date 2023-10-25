import { ILanguageItemList } from '../../interfaces/IUserData';
import { serverFetch } from '../fetch';

export function getLanguageListRequest(
	{ is_system, tenantId }: { is_system: boolean; tenantId: string },
	bearer_token: string
) {
	return serverFetch<ILanguageItemList>({
		path: `/languages?is_system=${is_system}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
