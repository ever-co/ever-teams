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

interface IRenameTenantCall {
	name: string;
	bearer_token: string;
	tenantId: string;
}

/** Gauzy's `PUT /tenant` renames the tenant of the token; the body carries the name and nothing else. */
export function renameTenantRequest({ name, bearer_token, tenantId }: IRenameTenantCall) {
	return serverFetch<unknown>({
		path: '/tenant',
		method: 'PUT',
		body: { name },
		bearer_token,
		tenantId
	});
}
