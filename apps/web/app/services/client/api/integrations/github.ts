import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import { getOrganizationIdCookie, getTenantIdCookie } from '@app/helpers';
import { IGithubMetadata, IGithubRepositories } from '@app/interfaces';
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
	const query = new URLSearchParams({
		tenantId: getTenantIdCookie(),
		organizationId: getOrganizationIdCookie()
	});

	const endpoint = GAUZY_API_BASE_SERVER_URL.value
		? `/integration/github/${integrationId}/metadata${query.toString()}`
		: `/integration/github/metadata?integrationId=${integrationId}`;

	return get<IGithubMetadata>(endpoint);
}

export function getGithubIntegrationRepositoriesAPI(integrationId: string) {
	const query = new URLSearchParams({
		tenantId: getTenantIdCookie(),
		organizationId: getOrganizationIdCookie()
	});

	const endpoint = GAUZY_API_BASE_SERVER_URL.value
		? `/integration/github/${integrationId}/repositories${query.toString()}`
		: `/integration/github/repositories?integrationId=${integrationId}`;

	return get<IGithubRepositories>(endpoint);
}

export function syncGitHubRepositoryAPI(body: any) {
	return api.post<any>('/integration/github/repository/sync', body);
}
