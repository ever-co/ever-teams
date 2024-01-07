import { IOrganizationTeamEmployeeUpdate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import {
	deleteOrganizationTeamEmployeeRequest,
	updateOrganizationTeamEmployeeRequest
} from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as IOrganizationTeamEmployeeUpdate;

	const { id } = params;

	if (id) {
		return $res(
			await updateOrganizationTeamEmployeeRequest({
				id: id as string,
				bearer_token: access_token,
				tenantId,
				body: body
			})
		);
	}
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId, teamId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const { searchParams } = new URL(req.url);

	const { employeeId } = searchParams as unknown as { employeeId: string };
	const { id } = params;

	if (id) {
		return $res(
			await deleteOrganizationTeamEmployeeRequest({
				id: id as string,
				bearer_token: access_token,
				tenantId,
				organizationId,
				employeeId: employeeId as string,
				organizationTeamId: teamId
			})
		);
	}
}
