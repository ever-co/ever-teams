import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';

import { createRoleRequest, getRolesRequest } from '@/core/services/server/requests';
import { IRole } from '@/core/types/interfaces/role/role';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res('unauthorized');

	try {
		const response = await getRolesRequest({
			bearer_token: access_token || '',
			tenantId: tenantId || ''
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The role could not be read.');
	}
}

export async function POST(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	const body = (await req.json()) as IRole;

	if (!user) return $res('unauthorized');

	try {
		const response = await createRoleRequest({
			bearer_token: access_token || '',
			tenantId: tenantId || '',
			data: {
				...body,
				tenantId
			}
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The role could not be created.');
	}
}
