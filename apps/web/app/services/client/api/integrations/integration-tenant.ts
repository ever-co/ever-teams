import {  IIntegrationTenant, PaginationResponse, CreateReponse } from '@app/interfaces';
import api from '../../axios';

export function getIntegrationTenantAPI(name: string) {
	return api.get<CreateReponse<PaginationResponse<IIntegrationTenant>>>(
		`/integration-tenant/remember/state?name=${name}`
	);
}
