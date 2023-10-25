import { IGithubMetadata, IGithubRepositories } from '@app/interfaces';
import { serverFetch } from '../../fetch';

export function installGitHubIntegration(
	data: {
		tenantId: string;
		organizationId: string;
		installation_id: string;
		setup_action: string;
	},
	bearer_token: string
) {
	return serverFetch<any>({
		path: '/integration/github/install',
		method: 'POST',
		bearer_token,
		body: data,
		tenantId: data.tenantId
	});
}

export function oAuthEndpointAuthorization(data: any, bearer_token: string) {
	return serverFetch<any>({
		path: '/integration/github/oauth',
		method: 'POST',
		bearer_token,
		body: data,
		tenantId: data.tenantId
	});
}

export function getGithubIntegrationMetadataRequest(
	{
		tenantId,
		organizationId,
		integrationId
	}: {
		tenantId: string;
		organizationId: string;
		integrationId: string;
	},
	bearer_token: string
) {
	const query = new URLSearchParams({
		tenantId,
		organizationId
	});
	return serverFetch<IGithubMetadata>({
		path: `/integration/github/${integrationId}/metadata?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId
	});
}

export function getGithubIntegrationRepositoriesRequest(
	{
		tenantId,
		organizationId,
		integrationId
	}: {
		tenantId: string;
		organizationId: string;
		integrationId: string;
	},
	bearer_token: string
) {
	const query = new URLSearchParams({
		tenantId,
		organizationId
	});
	return serverFetch<IGithubRepositories>({
		path: `/integration/github/${integrationId}/repositories?${query.toString()}`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId
	});
}
