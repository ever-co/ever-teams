import { CreateReponse, IIntegration } from '@app/interfaces';
import api from '../../axios';

export function getIntegrationAPI(integrationTypeId: string, searchQuery = '') {
	return api.get<CreateReponse<IIntegration>>(
		`/integration?integrationTypeId=${integrationTypeId}&searchQuery=${searchQuery}`
	);
}
