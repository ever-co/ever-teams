import api from '../../axios';

// TODO Type
export function getIntegrationTypesAPI() {
	return api.get<any>(`/integration/types`);
}
