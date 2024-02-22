import { INextParams, IOrganizationTeamEmployeeUpdate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import {
	deleteOrganizationTeamEmployeeRequest,
	updateOrganizationTeamEmployeeRequest
} from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	if (!params.id) {
		return;
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as IOrganizationTeamEmployeeUpdate;

	const response = await updateOrganizationTeamEmployeeRequest({
		id: params.id,
		bearer_token: access_token,
		tenantId,
		body: body
	});

	return $res(response.data);
}

export async function DELETE(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	if (!params.id) {
		return;
	}

	const { $res, user, access_token, tenantId, organizationId, teamId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	const employeeId = searchParams.get('employeeId') as string;

	const response = await deleteOrganizationTeamEmployeeRequest({
		id: params.id,
		bearer_token: access_token,
		tenantId,
		organizationId,
		employeeId: employeeId,
		organizationTeamId: teamId
	});

	return $res(response.data);
}

export async function generateStaticParams() {
	return [{ id: '' }];
}
