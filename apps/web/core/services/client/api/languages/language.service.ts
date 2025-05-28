import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ILanguageItemList } from '@/core/types/interfaces/common/language';

class LanguageService extends APIService {
	getLanguages = async (is_system: boolean) => {
		const endpoint = `/languages?is_system=${is_system}`;

		return this.get<PaginationResponse<ILanguageItemList>>(endpoint);
	};
}

export const languageService = new LanguageService(GAUZY_API_BASE_SERVER_URL.value);
