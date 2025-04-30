import { IOrganizationTeamEmployeeUpdate } from '@/core/types/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import {
	deleteOrganizationTeamEmployeeRequest,
	updateOrganizationTeamEmployeeRequest
} from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	const res = new NextResponse();

	if (!id) {
		return;
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as IOrganizationTeamEmployeeUpdate;

	const response = await updateOrganizationTeamEmployeeRequest({
		id: id,
		bearer_token: access_token,
		tenantId,
		body: body
	});

	return $res(response.data);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const id = (await params).id;
	const res = new NextResponse();

	if (!id) {
		return;
	}

	const { $res, user, access_token, tenantId, organizationId, teamId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	const employeeId = searchParams.get('employeeId') as string;

	const response = await deleteOrganizationTeamEmployeeRequest({
		id: id,
		bearer_token: access_token,
		tenantId,
		organizationId,
		employeeId: employeeId,
		organizationTeamId: teamId
	});

	return $res(response.data);
}
