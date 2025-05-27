import qs from 'qs';
import { APIService } from '../../api.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { IGithubMetadata } from '@/core/types/interfaces/integrations/IGithubMetadata';
import { IGithubRepositories } from '@/core/types/interfaces/integrations/IGithubRepositories';

class GithubService extends APIService {
	installGitHubIntegration = async (body: any) => {
		return this.post<any>('/integration/github/install', body);
	};

	oAuthEndpointAuthorization = async (body: any) => {
		return this.post<any>('/integration/github/oauth', body);
	};

	getGithubIntegrationMetadata = async (integrationId: string) => {
		const query = qs.stringify({
			tenantId: getTenantIdCookie(),
			organizationId: getOrganizationIdCookie()
		});

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/integration/github/${integrationId}/metadata?${query}`
			: `/integration/github/metadata?integrationId=${integrationId}`;

		return this.get<IGithubMetadata>(endpoint);
	};

	getGithubIntegrationRepositories = async (integrationId: string) => {
		const query = qs.stringify({
			tenantId: getTenantIdCookie(),
			organizationId: getOrganizationIdCookie()
		});

		const endpoint = GAUZY_API_BASE_SERVER_URL.value
			? `/integration/github/${integrationId}/repositories?${query}`
			: `/integration/github/repositories?integrationId=${integrationId}`;

		return this.get<IGithubRepositories>(endpoint);
	};

	syncGitHubRepository = async (body: any) => {
		return this.post<any>('/integration/github/repository/sync', body);
	};
}

export const githubService = new GithubService(GAUZY_API_BASE_SERVER_URL.value);
