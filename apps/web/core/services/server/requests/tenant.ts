import { ITenant } from '@/core/types/interfaces/to-review/ITenant';
import { serverFetch } from '../fetch';

export function createTenantRequest(name: string, bearer_token: string) {
	return serverFetch<ITenant>({
		path: '/tenant',
		method: 'POST',
		body: { name },
		bearer_token
	});
}
