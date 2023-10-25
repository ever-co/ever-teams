import { CreateReponse, IIntegrationTenant } from '@app/interfaces';
import api from '../../axios';

export function getIntegrationTenantAPI(name: string) {
	return api.get<CreateReponse<IIntegrationTenant>>(`/integration-tenant/remember/state?name=${name}`);
}
