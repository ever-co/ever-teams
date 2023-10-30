import { IIntegrationTenant, PaginationResponse, CreateResponse } from '@app/interfaces';
import api from '../../axios';

export function getIntegrationTenantAPI(name: string) {
	return api.get<CreateResponse<PaginationResponse<IIntegrationTenant>>>(
		`/integration-tenant/remember/state?name=${name}`
	);
}
