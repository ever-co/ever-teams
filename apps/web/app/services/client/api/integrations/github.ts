import { CreateResponse, IGithubMetadata, IGithubRepositories } from '@app/interfaces';
import api, { post } from '../../axios';

// TODO
export function installGitHubIntegrationAPI(body: any) {
	return post<any>('/integration/github/install', body);
}

// TODO
export function oAuthEndpointAuthorizationAPI(body: any) {
	return api.post<any>('/integration/github/oauth', body);
}

export function getGithubIntegrationMetadataAPI(integrationId: string) {
	return api.get<CreateResponse<IGithubMetadata>>(`/integration/github/metadata?integrationId=${integrationId}`);
}
export function getGithubIntegrationRepositoriesAPI(integrationId: string) {
	return api.get<CreateResponse<IGithubRepositories>>(
		`/integration/github/repositories?integrationId=${integrationId}`
	);
}

export function syncGitHubRepositoryAPI(body: any) {
	return api.post<any>('/integration/github/repository/sync', body);
}
