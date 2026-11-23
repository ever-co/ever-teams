import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getRolePermissionsRequest, updateRolePermissionRequest } from '@/core/services/server/requests';
import { INextParams } from '@/core/types/interfaces/common/data-response';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');

	try {
		const response = await getRolePermissionsRequest({
			roleId: params.id,
			bearer_token: access_token || '',
			tenantId: tenantId || ''
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The permission of the role could not be read.');
	}
}

export async function PUT(req: Request, props: INextParams) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');

	const body = await req.json();

	try {
		const response = await updateRolePermissionRequest({
			bearer_token: access_token || '',
			tenantId: tenantId || '',
			data: body
		});
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The permission of the role could not be updated.');
	}
}
