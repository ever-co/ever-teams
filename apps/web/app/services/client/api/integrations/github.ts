import {
	CreateReponse,
	IGithubMetadata,
	IGithubRepositories,
} from '@app/interfaces';
import api from '../../axios';

// TODO
export function installGitHubIntegrationAPI(body: any) {
	return api.post<any>('/integration/github/install', body);
}

// TODO
export function oAuthEndpointAuthorizationAPI(body: any) {
	return api.post<any>('/integration/github/oauth', body);
}

export function getGithubIntegrationMetadataAPI(integrationId: string) {
	return api.get<CreateReponse<IGithubMetadata>>(
		`/integration/github/metadata?integrationId=${integrationId}`
	);
}
export function getGithubIntegrationRepositoriesAPI(integrationId: string) {
	return api.get<CreateReponse<IGithubRepositories>>(
		`/integration/github/repositories?integrationId=${integrationId}`
	);
}
