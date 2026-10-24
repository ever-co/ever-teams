/**
 * Test-only (never part of the app). What `authenticatedGuard` (core/services/server/guards/authenticated-guard-app.ts)
 * answers, for the tests of routes that mock it. A signed-in answer carries a tenant cookie that differs from any
 * session tenant, so a route that scopes by the client-writable cookie instead of `user.tenantId` fails its test.
 */
import { NextResponse } from 'next/server';

/** The guard's answer for a valid session of `user`. */
export function signedIn(user: Record<string, unknown>) {
	return {
		$res: (data: unknown) => NextResponse.json(data),
		user,
		access_token: 'access-token',
		tenantId: 'cookie-tenant',
		organizationId: 'organization-1',
		teamId: 'team-1',
		taskId: undefined,
		projectId: undefined
	};
}

/** The guard's answer when Gauzy refuses the session (401) or cannot answer (503). */
export function refused(status: number) {
	const message = status === 503 ? 'Session check unavailable, retry later' : 'Unauthorized';
	return {
		$res: (data: unknown) => NextResponse.json({ statusCode: status, message: data }, { status }),
		user: null,
		status,
		deny: () => NextResponse.json({ message }, { status })
	};
}
