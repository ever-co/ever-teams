import api from '../../axios';

// TODO Type
export function getIntegrationAPI(integrationTypeId: string, searchQuery = '') {
	return api.get<any>(
		`/integration?integrationTypeId=${integrationTypeId}&searchQuery=${searchQuery}`
	);
}
