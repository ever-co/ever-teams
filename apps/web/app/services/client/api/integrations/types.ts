import { CreateReponse, IIntegrationType } from '@app/interfaces';
import api from '../../axios';

export function getIntegrationTypesAPI() {
	return api.get<CreateReponse<IIntegrationType>>(`/integration/types`);
}
