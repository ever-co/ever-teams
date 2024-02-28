import { INextParams } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';

import {
	deleteOrganizationTeamRequest,
	getOrganizationTeamRequest,
	updateOrganizationTeamRequest
} from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	if (!params.id) {
		return;
	}

	const { $res, user, organizationId, access_token, tenantId, teamId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({}, { status: 400 });

	const { data } = await getOrganizationTeamRequest(
		{
			organizationId,
			tenantId,
			teamId: teamId
		},
		access_token
	);

	return $res(data);
}

export async function PUT(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	if (!params.id) {
		return;
	}

	const { $res, user, organizationId, access_token, tenantId, teamId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({}, { status: 400 });

	const body = await req.json();

	const { data } = await getOrganizationTeamRequest(
		{
			organizationId,
			tenantId,
			teamId: teamId
		},
		access_token
	);

	await updateOrganizationTeamRequest(body, access_token);

	return $res(data);
}

export async function DELETE(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	if (!params.id) {
		return;
	}

	const { $res, user, organizationId, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({}, { status: 400 });

	const response = await deleteOrganizationTeamRequest({
		id: params.id,
		bearer_token: access_token,
		tenantId,
		organizationId
	});

	return $res(response.data);
}
