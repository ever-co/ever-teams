import { CreateResponse, IIntegration } from '@app/interfaces';
import api from '../../axios';

export function getIntegrationAPI(integrationTypeId: string, searchQuery = '') {
	return api.get<CreateResponse<IIntegration[]>>(
		`/integration?integrationTypeId=${integrationTypeId}&searchQuery=${searchQuery}`
	);
}
