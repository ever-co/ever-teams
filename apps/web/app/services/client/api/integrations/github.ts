import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import { getOrganizationIdCookie, getTenantIdCookie } from '@app/helpers';
import { CreateResponse, IGithubMetadata, IGithubRepositories } from '@app/interfaces';
import api, { get, post } from '../../axios';

// TODO
export function installGitHubIntegrationAPI(body: any) {
	return post<any>('/integration/github/install', body);
}

// TODO
export function oAuthEndpointAuthorizationAPI(body: any) {
	return post<any>('/integration/github/oauth', body);
}

export function getGithubIntegrationMetadataAPI(integrationId: string) {
	if (GAUZY_API_BASE_SERVER_URL.value) {
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();

		const query = new URLSearchParams({
			tenantId,
			organizationId
		});

		return get<IGithubMetadata>(`/integration/github/${integrationId}/metadata${query.toString()}`);
	}

	return api.get<IGithubMetadata>(`/integration/github/metadata?integrationId=${integrationId}`);
}

export function getGithubIntegrationRepositoriesAPI(integrationId: string) {
	return api.get<CreateResponse<IGithubRepositories>>(
		`/integration/github/repositories?integrationId=${integrationId}`
	);
}

export function syncGitHubRepositoryAPI(body: any) {
	return api.post<any>('/integration/github/repository/sync', body);
}
