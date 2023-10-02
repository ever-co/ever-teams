import { serverFetch } from '../../fetch';

// TODO Types/Interface
export function installGitHubIntegration(data: any, bearer_token: string) {
	return serverFetch<any>({
		path: '/integration/github/install',
		method: 'POST',
		bearer_token,
		body: data,
		tenantId: data.tenantId,
	});
}

// TODO Types/Interface
export function oAuthEndpointAuthorization(data: any, bearer_token: string) {
	return serverFetch<any>({
		path: '/integration/github/oauth',
		method: 'POST',
		bearer_token,
		body: data,
		tenantId: data.tenantId,
	});
}

export function getGithubIntegrationMetadataRequest(
	{ tenantId, organizationId, integrationId }: any,
	bearer_token: string
) {
	const query = new URLSearchParams({
		tenantId,
		organizationId,
	});
	return serverFetch<any>({
		path: `/integration/github/${integrationId}/metadata?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId,
	});
}

export function getGithubIntegrationRepositoriesRequest(
	{ tenantId, organizationId, integrationId }: any,
	bearer_token: string
) {
	const query = new URLSearchParams({
		tenantId,
		organizationId,
	});
	return serverFetch<any>({
		path: `/integration/github/${integrationId}/repositories?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId,
	});
}
