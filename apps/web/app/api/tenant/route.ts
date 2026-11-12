import { NextResponse } from 'next/server';
import { renameWorkspaceBodySchema } from '@/core/lib/validation/workspace';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { renameTenantRequest } from '@/core/services/server/requests/tenant';

/**
 * Proxy mode twin of Gauzy's `PUT /tenant`, for the workspace's name alone. Gauzy renames the tenant of the session
 * and lets its super admin alone do it: anyone else gets its 403.
 */
export async function PUT(req: Request) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	const body: unknown = await req.json().catch(() => null);
	const parsedBody = renameWorkspaceBodySchema.safeParse(body);
	if (!parsedBody.success) {
		return NextResponse.json({ message: 'A workspace name of 1 to 60 characters is required' }, { status: 400 });
	}
	const name = parsedBody.data.name;

	try {
		await renameTenantRequest({ name, bearer_token: access_token, tenantId });
		return $res({ name });
	} catch (error) {
		return gauzyErrorResponse(error, 'The workspace could not be renamed.');
	}
}
