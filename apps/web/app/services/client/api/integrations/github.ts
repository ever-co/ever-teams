import api from '../../axios';

// TODO
export function installGitHubIntegrationAPI(body: any) {
	return api.post<any>('/integration/github/install', body);
}
