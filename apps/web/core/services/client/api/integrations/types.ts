import { IIntegrationType } from '@/core/types/interfaces';
import { get } from '../../axios';

export function getIntegrationTypesAPI() {
	return get<IIntegrationType[]>(`/integration/types`);
}
