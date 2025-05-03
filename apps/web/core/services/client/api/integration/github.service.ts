import qs from 'qs';
import { APIService } from '../../api.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { IGithubMetadata, IGithubRepositories } from '@/core/types/interfaces';

class GithubService extends APIService {
	installGitHubIntegrationAPI = async (body: any) => {
		return this.post<any>('/integration/github/install', body);
	};

	oAuthEndpointAuthorizationAPI = async (body: any) => {
		return this.post<any>('/integration/github/oauth', body);
	};

	getGithubIntegrationMetadataAPI = async (integrationId: string) => {
		const query = qs.stringify({
			tenantId: getTenantIdCookie(),
			organizationId: getOrganizationIdCookie()
		});

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/integration/github/${integrationId}/metadata${query}`
			: `/integration/github/metadata?integrationId=${integrationId}`;

		return this.get<IGithubMetadata>(endpoint);
	};

	getGithubIntegrationRepositoriesAPI = async (integrationId: string) => {
		const query = qs.stringify({
			tenantId: getTenantIdCookie(),
			organizationId: getOrganizationIdCookie()
		});

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/integration/github/${integrationId}/repositories${query}`
			: `/integration/github/repositories?integrationId=${integrationId}`;

		return this.get<IGithubRepositories>(endpoint);
	};

	syncGitHubRepositoryAPI = async (body: any) => {
		return this.post<any>('/integration/github/repository/sync', body);
	};
}

export const githubService = new GithubService(GAUZY_API_BASE_SERVER_URL.value);
