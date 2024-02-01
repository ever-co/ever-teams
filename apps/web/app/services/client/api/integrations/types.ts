import { IIntegrationType } from '@app/interfaces';
import { get } from '../../axios';

export function getIntegrationTypesAPI() {
	return get<IIntegrationType[]>(`/integration/types`);
}
