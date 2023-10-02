import api from '../../axios';

// TODO Type
export function getIntegrationTenantAPI(name: string) {
	return api.get<any>(`/integration-tenant/remember/state?name=${name}`);
}
