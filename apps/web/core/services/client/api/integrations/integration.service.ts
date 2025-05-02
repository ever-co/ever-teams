import { IIntegration } from '@/core/types/interfaces';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class IntegrationService extends APIService {
	getIntegrationAPI = async (integrationTypeId: string, searchQuery = '') => {
		return this.get<IIntegration[]>(
			`/integration?integrationTypeId=${integrationTypeId}&searchQuery=${searchQuery}`
		);
	};
}

export const integrationService = new IntegrationService(GAUZY_API_BASE_SERVER_URL.value);
