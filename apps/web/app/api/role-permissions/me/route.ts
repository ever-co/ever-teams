import { forwardToGauzy } from '@/core/services/server/forward-to-gauzy';

/**
 * The signed-in user's own role permissions (GET /role-permissions/me, open to any signed-in user).
 * Without this static segment, proxy mode sent the request to role-permissions/[id] with id "me".
 */
export function GET(req: Request) {
	return forwardToGauzy(req, '/role-permissions/me');
}
