import api from '../../axios';

// TODO Type
export function getIntegrationTenantAPI() {
	return api.get<any>(`/integration/types`);
}
