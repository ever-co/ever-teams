import { ITenant } from '@/core/types/interfaces/tenant/tenant';
import { serverFetch } from '../fetch';

export function createTenantRequest(name: string, bearer_token: string) {
	return serverFetch<ITenant>({
		path: '/tenant',
		method: 'POST',
		body: { name },
		bearer_token
	});
}
