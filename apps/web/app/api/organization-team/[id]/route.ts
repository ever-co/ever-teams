import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';

import {
	deleteOrganizationTeamRequest,
	getOrganizationTeamRequest,
	updateOrganizationTeamRequest
} from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, organizationId, access_token, tenantId, teamId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 400 });

	const getTeamStatus = async () => {
		const { data: team } = await getOrganizationTeamRequest(
			{
				organizationId,
				tenantId,
				teamId: teamId
			},
			access_token
		);

		return team;
	};

	return $res(await getTeamStatus());
}

export async function PUT(req: Request) {
	const res = new NextResponse();
	const { $res, user, organizationId, access_token, tenantId, teamId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 400 });

	const body = await req.json();
	const getTeamStatus = async () => {
		const { data: team } = await getOrganizationTeamRequest(
			{
				organizationId,
				tenantId,
				teamId: teamId
			},
			access_token
		);

		return team;
	};

	await updateOrganizationTeamRequest(body, access_token);
	return $res(await getTeamStatus());
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const { $res, user, organizationId, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 400 });

	const { id } = params;

	if (id) {
		return $res(
			await deleteOrganizationTeamRequest({
				id: id as string,
				bearer_token: access_token,
				tenantId,
				organizationId
			})
		);
	}
}
