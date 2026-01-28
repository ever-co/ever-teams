import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	validateApiResponse,
	githubMetadataSchema,
	githubRepositoriesSchema,
	minimalGithubMetadataSchema,
	minimalGithubRepositoriesSchema,
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

	getGithubIntegrationMetadata = async ({
		integrationId
	}: {
		integrationId: string;
	}): Promise<TGithubMetadata | TMinimalGithubMetadata> => {
		const query = qs.stringify({
			tenantId: this.tenantId,
			organizationId: this.organizationId
		});

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/integration/github/${integrationId}/metadata?${query}`
			: `/integration/github/metadata?integrationId=${integrationId}`;

		return this.executeWithValidation(
			() => this.get<TGithubMetadata | TMinimalGithubMetadata>(endpoint),
			(data) => {
				try {
					return validateApiResponse(
						githubMetadataSchema,
						data,
						'getGithubIntegrationMetadata API response'
					);
				} catch (validationError) {
					this.logger.debug(
						'Full GitHub metadata validation failed, trying minimal schema',
						data,
						'GithubService'
					);
					return validateApiResponse(
						minimalGithubMetadataSchema,
						data,
						'getGithubIntegrationMetadata minimal API response'
					);
				}
			},
			{ method: 'getGithubIntegrationMetadata', service: 'GithubService', integrationId }
		);
	};

	getGithubIntegrationRepositories = async ({
		integrationId
	}: {
		integrationId: string;
	}): Promise<TGithubRepositories | TMinimalGithubRepositories> => {
		const query = qs.stringify({
			tenantId: this.tenantId,
			organizationId: this.organizationId
		});

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/integration/github/${integrationId}/repositories?${query}`
			: `/integration/github/repositories?integrationId=${integrationId}`;

		return this.executeWithValidation(
			() => this.get<any>(endpoint),
			(data) => {
				try {
					return validateApiResponse(
						githubRepositoriesSchema,
						data,
						'getGithubIntegrationRepositories API response'
					);
				} catch (validationError) {
					this.logger.debug(
						'Full GitHub repositories validation failed, trying minimal schema',
						data,
						'GithubService'
					);
					return validateApiResponse(
						minimalGithubRepositoriesSchema,
						data,
						'getGithubIntegrationRepositories minimal API response'
					);
				}
			},
			{ method: 'getGithubIntegrationRepositories', service: 'GithubService', integrationId }
		);
	};

	syncGitHubRepository = async (body: any) => {
		return this.post<any>('/integration/github/repository/sync', body);
	};
}

export const githubService = new GithubService(GAUZY_API_BASE_SERVER_URL.value);
