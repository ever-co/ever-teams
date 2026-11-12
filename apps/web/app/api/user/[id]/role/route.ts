import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { assignUserRoleRequest } from '@/core/services/server/requests/user';
import { userRoleBodySchema, userRouteIdSchema } from '@/core/lib/validation/member-access';

/**
 * Proxy mode: gives a workspace role to an account. `PUT /api/user/:id` writes the signed-in account whatever the
 * id, so the role of someone else goes through this route, which forwards the role and nothing else. Gauzy decides
 * who may give which role, and its refusal is passed on.
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

	try {
		await assignUserRoleRequest({ userId, roleId, bearer_token: access_token, tenantId });
		return $res({ id: userId, roleId });
	} catch (error) {
		return gauzyErrorResponse(error, 'The role could not be changed.');
	}
}
