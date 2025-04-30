import { ILanguageItemList, PaginationResponse } from '@/core/types/interfaces';
import { get } from '../axios';

export async function getLanguageListAPI(is_system: boolean) {
	const endpoint = `/languages?is_system=${is_system}`;

	return get<PaginationResponse<ILanguageItemList>>(endpoint);
}
