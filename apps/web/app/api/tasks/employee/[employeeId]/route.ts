import { INextParams } from '@/core/types/interfaces/common/data-response';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteEmployeeFromTasksRequest, getEmployeeTasksRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();

	if (!params.employeeId) {
		return;
	}

	const { $res, user, tenantId, access_token: bearer_token } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	const { organizationTeamId } = searchParams as unknown as {
		organizationTeamId: string;
	};

	const response = await getEmployeeTasksRequest({
		employeeId: params.employeeId,
		organizationTeamId,
		tenantId: tenantId || '',
		bearer_token: bearer_token || ''
	});

	return $res(response.data);
}

export async function DELETE(req: Request, props: INextParams) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const params = await props.params;
	const res = new NextResponse();

	if (!params.employeeId) {
		return;
	}

	const { $res, user, tenantId, access_token: bearer_token } = await authenticatedGuard(req, res);

	if (!user) {
		return $res('Unauthorized');
	}

	const { searchParams } = new URL(req.url);

	const organizationTeamId = searchParams.get('organizationTeamId') as string;

	try {
		const response = await deleteEmployeeFromTasksRequest({
			employeeId: params.employeeId,
			organizationTeamId,
			tenantId: tenantId || '',
			bearer_token: bearer_token || ''
		});
		// The API answers this unassignment 200 with an empty body, which is no JSON to hand on (#5727)
		const hasBody = response.data !== undefined && response.data !== null;
		if (!hasBody) {
			return new NextResponse(null, { status: 200 });
		}
		return $res(response.data);
	} catch (error) {
		return await gauzyErrorResponse(error, 'The tasks could not be unassigned');
	}
}
