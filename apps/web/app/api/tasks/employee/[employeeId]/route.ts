import { INextParams } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { deleteEmployeeFromTasksRequest, getEmployeeTasksRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

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
		tenantId,
		bearer_token
	});

    return $res(response.data);
}

export async function DELETE(req: Request, props: INextParams) {
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

    const response = await deleteEmployeeFromTasksRequest({
		employeeId: params.employeeId,
		organizationTeamId,
		tenantId,
		bearer_token
	});

    return $res(response.data);
}
