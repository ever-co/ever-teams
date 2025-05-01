import { IIntegration } from '@/core/types/interfaces';
import { get } from '../../axios';

export function getIntegrationAPI(integrationTypeId: string, searchQuery = '') {
	return get<IIntegration[]>(`/integration?integrationTypeId=${integrationTypeId}&searchQuery=${searchQuery}`);
}
