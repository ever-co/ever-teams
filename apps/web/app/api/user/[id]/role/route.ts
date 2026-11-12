import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { getMyRolePermissionsRequest } from '@/core/services/server/requests/role-permissions';
import { getRolesRequest } from '@/core/services/server/requests/roles';
import { assignUserRoleRequest, getUserByIdRequest } from '@/core/services/server/requests/user';
import { enabledPermissionsOf, isWorkspaceRoleChangeWithinReach } from '@/core/lib/utils/member-access';
import {
	roleChangeFactsSchema,
	userRoleBodySchema,
	userRouteIdSchema,
	type RoleChangeFacts
} from '@/core/lib/validation/member-access';
import type { TUser } from '@/core/types/schemas';

const NOT_CHANGED_MESSAGE = 'The role could not be changed.';
const OUT_OF_REACH_MESSAGE = 'You cannot give this role to this account.';

interface Session {
	bearer_token: string;
	tenantId: string;
}

/** Read with the caller's own token: a read Gauzy refuses rejects, and the route passes that refusal on. */
async function readRoleChangeFacts(userId: string, session: Session): Promise<RoleChangeFacts | null> {
	const [permissions, roles, account] = await Promise.all([
		getMyRolePermissionsRequest(session),
		getRolesRequest(session),
		getUserByIdRequest({ id: userId, ...session })
	]);
	const facts = roleChangeFactsSchema.safeParse({
		permissions: permissions.data,
		roles: roles.data,
		account: account.data
	});
	if (!facts.success) {
		return null;
	}
	return facts.data;
}

function isChangeWithinReach(viewer: Pick<TUser, 'id' | 'role'>, facts: RoleChangeFacts, roleId: string): boolean {
	const permissions = enabledPermissionsOf(facts.permissions);
	return isWorkspaceRoleChangeWithinReach({
		viewerUserId: viewer.id,
		viewerRoleName: viewer.role?.name,
		permissions,
		roles: facts.roles.items,
		accountUserId: facts.account.id,
		accountRoleId: facts.account.roleId,
		roleId
	});
}

/**
 * Proxy mode: gives a workspace role to an account. `PUT /api/user/:id` writes the signed-in account whatever the
 * id, so the role of someone else goes through this route, which forwards the role and nothing else.
 *
 * Gauzy ranks no role below super admin, and the role menu offers less than Gauzy accepts. This route is the only
 * way to another account's role through this app, so it applies the rules of the menu to Gauzy's own answers before
 * it forwards. A token sent to Gauzy directly meets Gauzy's guard alone.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const parsedId = userRouteIdSchema.safeParse((await params).id);
	if (!parsedId.success) {
		return NextResponse.json({ message: 'A user id is required' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	const body: unknown = await req.json().catch(() => null);
	const parsedBody = userRoleBodySchema.safeParse(body);
	if (!parsedBody.success) {
		return NextResponse.json({ message: 'A role id is required' }, { status: 400 });
	}

	const userId = parsedId.data;
	const roleId = parsedBody.data.roleId;
	const session: Session = { bearer_token: access_token, tenantId };

	try {
		const facts = await readRoleChangeFacts(userId, session);
		if (!facts) {
			return NextResponse.json({ message: NOT_CHANGED_MESSAGE }, { status: 502 });
		}
		const isWithinReach = isChangeWithinReach(user, facts, roleId);
		if (!isWithinReach) {
			return NextResponse.json({ statusCode: 403, message: OUT_OF_REACH_MESSAGE }, { status: 403 });
		}
		await assignUserRoleRequest({ userId, roleId, ...session });
		return $res({ id: userId, roleId });
	} catch (error) {
		return gauzyErrorResponse(error, NOT_CHANGED_MESSAGE);
	}
}
