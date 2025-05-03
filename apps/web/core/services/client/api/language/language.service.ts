import { ILanguageItemList, PaginationResponse } from '@/core/types/interfaces';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class LanguageService extends APIService {
	getLanguages = async (is_system: boolean) => {
		const endpoint = `/languages?is_system=${is_system}`;

		return this.get<PaginationResponse<ILanguageItemList>>(endpoint);
	};
}

export const languageService = new LanguageService(GAUZY_API_BASE_SERVER_URL.value);
