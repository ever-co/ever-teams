import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	validateApiResponse,
	integrationTypeListSchema,
	integrationListSchema,
	ZodValidationError,
	TIntegrationTypeList,
	TIntegrationList
} from '@/core/types/schemas';

class IntegrationService extends APIService {
	getIntegration = async (integrationTypeId: string, searchQuery = ''): Promise<TIntegrationList[]> => {
		try {
			const response = await this.get<TIntegrationList[]>(
				`/integration?integrationTypeId=${integrationTypeId}&searchQuery=${searchQuery}`
			);

			// Validate the response data using Zod schema
			return validateApiResponse(integrationListSchema.array(), response.data, 'getIntegration API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Integration validation failed:', {
					message: error.message,
					issues: error.issues
				});
			}
			throw error;
		}
	};

	getIntegrationTypes = async (): Promise<TIntegrationTypeList[]> => {
		try {
			const response = await this.get<TIntegrationTypeList[]>(`/integration/types`);

			// Validate the response data using Zod schema
			return validateApiResponse(
				integrationTypeListSchema.array(),
				response.data,
				'getIntegrationTypes API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Integration types validation failed:', {
					message: error.message,
					issues: error.issues
				});
			}
			throw error;
		}
	};
}

export const integrationService = new IntegrationService(GAUZY_API_BASE_SERVER_URL.value);
