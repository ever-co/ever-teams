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
