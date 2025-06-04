import qs from 'qs';
import { APIService } from '../../api.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	validateApiResponse,
	githubMetadataSchema,
	githubRepositoriesSchema,
	minimalGithubMetadataSchema,
	minimalGithubRepositoriesSchema,
	ZodValidationError,
	TGithubMetadata,
	TMinimalGithubMetadata,
	TMinimalGithubRepositories,
	TGithubRepositories
} from '@/core/types/schemas';

class GithubService extends APIService {
	installGitHubIntegration = async (body: any) => {
		return this.post<any>('/integration/github/install', body);
	};

	oAuthEndpointAuthorization = async (body: any) => {
		return this.post<any>('/integration/github/oauth', body);
	};

	getGithubIntegrationMetadata = async (integrationId: string): Promise<TGithubMetadata | TMinimalGithubMetadata> => {
		const query = qs.stringify({
			tenantId: getTenantIdCookie(),
			organizationId: getOrganizationIdCookie()
		});

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/integration/github/${integrationId}/metadata?${query}`
			: `/integration/github/metadata?integrationId=${integrationId}`;

		try {
			const response = await this.get<TGithubMetadata | TMinimalGithubMetadata>(endpoint);

			// Validate the response data using Zod schema with fallback
			try {
				return validateApiResponse(
					githubMetadataSchema,
					response.data,
					'getGithubIntegrationMetadata API response'
				);
			} catch (validationError) {
				// Fallback to minimal schema if full validation fails
				this.logger.debug(
					'Full GitHub metadata validation failed, trying minimal schema',
					response.data,
					'GithubService'
				);
				return validateApiResponse(
					minimalGithubMetadataSchema,
					response.data,
					'getGithubIntegrationMetadata minimal API response'
				);
			}
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('GitHub metadata validation failed:', {
					message: error.message,
					issues: error.issues
				});
			}
			throw error;
		}
	};

	getGithubIntegrationRepositories = async (
		integrationId: string
	): Promise<TGithubRepositories | TMinimalGithubRepositories> => {
		const query = qs.stringify({
			tenantId: getTenantIdCookie(),
			organizationId: getOrganizationIdCookie()
		});

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/integration/github/${integrationId}/repositories?${query}`
			: `/integration/github/repositories?integrationId=${integrationId}`;

		try {
			const response = await this.get<any>(endpoint);

			// Validate the response data using Zod schema with fallback
			try {
				return validateApiResponse(
					githubRepositoriesSchema,
					response.data,
					'getGithubIntegrationRepositories API response'
				);
			} catch (validationError) {
				// Fallback to minimal schema if full validation fails
				this.logger.debug(
					'Full GitHub repositories validation failed, trying minimal schema',
					response.data,
					'GithubService'
				);
				return validateApiResponse(
					minimalGithubRepositoriesSchema,
					response.data,
					'getGithubIntegrationRepositories minimal API response'
				);
			}
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('GitHub repositories validation failed:', {
					message: error.message,
					issues: error.issues
				});
			}
			throw error;
		}
	};

	syncGitHubRepository = async (body: any) => {
		return this.post<any>('/integration/github/repository/sync', body);
	};
}

export const githubService = new GithubService(GAUZY_API_BASE_SERVER_URL.value);
