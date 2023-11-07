import { CreateResponse, IIntegrationType } from '@app/interfaces';
import api from '../../axios';

export function getIntegrationTypesAPI() {
	return api.get<CreateResponse<IIntegrationType[]>>(`/integration/types`);
}
