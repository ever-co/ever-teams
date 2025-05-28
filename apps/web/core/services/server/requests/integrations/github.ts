import { IGithubMetadata, IGithubRepositories, IProjectRepository } from '@/core/types/interfaces/to-review';
import { serverFetch } from '../../fetch';
import qs from 'qs';

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
	const query = qs.stringify({
		tenantId,
		organizationId
	});
	return serverFetch<IGithubMetadata>({
		path: `/integration/github/${integrationId}/metadata?${query}`,
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
	const query = qs.stringify({
		tenantId,
		organizationId
	});
	return serverFetch<IGithubRepositories>({
		path: `/integration/github/${integrationId}/repositories?${query}`,
		method: 'GET',
		bearer_token,
		tenantId: tenantId
	});
}

export function projectRepositorySyncRequest(
	body: {
		installationId: string;
		organizationId: string;
		tenantId: string;
		repository: IProjectRepository;
	},
	bearer_token: string
) {
	return serverFetch<any>({
		path: '/integration/github/repository/sync',
		method: 'POST',
		bearer_token,
		body: {
			installation_id: body.installationId,
			organizationId: body.organizationId,
			tenantId: body.tenantId,
			repository: body.repository
		},
		tenantId: body.tenantId
	});
}
