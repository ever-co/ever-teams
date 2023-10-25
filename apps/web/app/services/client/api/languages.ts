import { ILanguageItemList, CreateReponse, PaginationResponse } from '@app/interfaces';
import api from '../axios';

export function getLanguageListAPI(is_system: boolean) {
	return api.get<CreateReponse<PaginationResponse<ILanguageItemList>>>(`/languages?is_system=${is_system}`);
}
