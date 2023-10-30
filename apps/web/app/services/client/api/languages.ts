import { ILanguageItemList, CreateResponse, PaginationResponse } from '@app/interfaces';
import api from '../axios';

export function getLanguageListAPI(is_system: boolean) {
	return api.get<CreateResponse<PaginationResponse<ILanguageItemList>>>(`/languages?is_system=${is_system}`);
}
