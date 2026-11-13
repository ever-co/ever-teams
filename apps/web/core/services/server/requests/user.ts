import { TUser } from '@/core/types/schemas';
import { serverFetch } from '../fetch';

export function getUserByIdRequest({
	id,
	bearer_token,
	tenantId
}: {
	id: string | any;
	bearer_token: string | any;
	tenantId?: string;
}) {
	return serverFetch<TUser>({
		path: `/user/${id}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function deleteUserRequest({
	id,
	bearer_token,
	tenantId
}: {
	id: string | any;
	bearer_token: string | any;
	tenantId?: string;
}) {
	return serverFetch<any>({
		path: `/user/${id}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

/**
 * Gives a workspace role to an account through Gauzy's `PUT /user/:id`, with the role and nothing else in the body.
 * Gauzy decides: ORG_USERS_EDIT for someone else, SUPER_ADMIN_EDIT for the super admin role, never one's own role.
 */
export function assignUserRoleRequest({
	userId,
	roleId,
	bearer_token,
	tenantId
}: {
	userId: string;
	roleId: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<unknown>({
		path: `/user/${encodeURIComponent(userId)}`,
		method: 'PUT',
		body: { roleId },
		bearer_token,
		tenantId
	});
}

/** How long the platform may take to store a UI preference before the request is given up. */
export const UI_PREFERENCE_WRITE_TIMEOUT_MS = 5_000;

/**
 * Replaces one feature of the signed-in user's UI preferences on the platform (`PUT /user/ui-preferences`), which
 * merges them shallowly per feature, so the user's other features stay as they are. Answers the preferences as stored.
 * A platform that does not answer within {@link UI_PREFERENCE_WRITE_TIMEOUT_MS} rejects it, so it never holds the
 * caller's own answer.
 */
export function setUserUiPreferenceRequest({
	feature,
	value,
	bearer_token,
	tenantId
}: {
	feature: string;
	value: Record<string, unknown> | null;
	bearer_token: string;
	tenantId?: string;
}) {
	return serverFetch<Record<string, unknown>>({
		path: '/user/ui-preferences',
		method: 'PUT',
		body: { [feature]: value },
		bearer_token,
		tenantId,
		init: { signal: AbortSignal.timeout(UI_PREFERENCE_WRITE_TIMEOUT_MS) }
	});
}

export function resetUserRequest({ bearer_token, tenantId }: { bearer_token: string | any; tenantId?: string }) {
	return serverFetch<any>({
		path: `/user/reset`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}
