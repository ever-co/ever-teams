import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	validateApiResponse,
	integrationTypeListSchema,
	integrationListSchema,
	TIntegrationTypeList,
	TIntegrationList
} from '@/core/types/schemas';

class IntegrationService extends APIService {
	getIntegration = async (integrationTypeId: string, searchQuery = ''): Promise<TIntegrationList[]> => {
		return this.executeWithValidation(
			() => this.get<TIntegrationList[]>(
				`/integration?integrationTypeId=${integrationTypeId}&searchQuery=${searchQuery}`
			),
			(data) => validateApiResponse(integrationListSchema.array(), data, 'getIntegration API response'),
			{ method: 'getIntegration', service: 'IntegrationService', integrationTypeId }
		);
	};

	getIntegrationTypes = async (): Promise<TIntegrationTypeList[]> => {
		return this.executeWithValidation(
			() => this.get<TIntegrationTypeList[]>(`/integration/types`),
			(data) => validateApiResponse(integrationTypeListSchema.array(), data, 'getIntegrationTypes API response'),
			{ method: 'getIntegrationTypes', service: 'IntegrationService' }
		);
	};
}

export const integrationService = new IntegrationService(GAUZY_API_BASE_SERVER_URL.value);
