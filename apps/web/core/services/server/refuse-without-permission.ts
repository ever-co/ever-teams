import { NextResponse } from 'next/server';
import { holdsAnyPermission } from '@/core/lib/utils/clients';
import { forwardToGauzy } from './forward-to-gauzy';

interface RolePermissionRow {
	permission?: unknown;
	enabled?: unknown;
}

function enabledPermissionsOf(rows: unknown) {
	if (!Array.isArray(rows)) {
		return [];
	}
	const permissions: string[] = [];
	for (const row of rows as RolePermissionRow[]) {
		const isEnabled = row?.enabled === true;
		const permission = row?.permission;
		if (isEnabled && typeof permission === 'string') {
			permissions.push(permission);
		}
	}
	return permissions;
}

/**
 * The answer a proxy route gives instead of forwarding, or null when `isPermitted` accepts the permissions the
 * session's role holds. They are read from Gauzy with the session's own token, so the route refuses what the page
 * hides, whatever the Gauzy version behind it checks on that call.
 */
export async function refuseUnlessPermitted(
	req: Request,
	isPermitted: (held: readonly string[]) => boolean
): Promise<Response | null> {
	const permissionsUrl = new URL('/api/role-permissions/me', req.url);
	const permissionsRequest = new Request(permissionsUrl, {
		headers: { cookie: req.headers.get('cookie') ?? '' },
		signal: req.signal
	});
	const answer = await forwardToGauzy(permissionsRequest, '/role-permissions/me');
	if (!answer.ok) {
		return answer;
	}
	const rows: unknown = await answer.json().catch(() => null);
	const held = enabledPermissionsOf(rows);
	if (isPermitted(held)) {
		return null;
	}
	return NextResponse.json({ statusCode: 403, message: 'Forbidden resource' }, { status: 403 });
}

/** Refuses a write unless the session's role holds one of `permissions`. */
export async function refuseWithoutPermission(req: Request, permissions: readonly string[]): Promise<Response | null> {
	return refuseUnlessPermitted(req, (held) => holdsAnyPermission(held, permissions));
}
