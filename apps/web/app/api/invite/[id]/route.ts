/* eslint-disable no-case-declarations */
import { MyInvitationActionEnum } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import {
	getTeamInvitationsRequest,
	removeTeamInvitationsRequest,
	getMyInvitationsRequest,
	acceptRejectMyInvitationsRequest
} from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { id: string } }) {
	const res = new NextResponse();
	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	const { data } = await getMyInvitationsRequest(tenantId, access_token);

	return $res(data);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const invitationId = params.id;

	if (!invitationId) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId, organizationId, teamId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	await removeTeamInvitationsRequest({
		bearer_token: access_token,
		tenantId: tenantId,
		invitationId
	});

	const { data } = await getTeamInvitationsRequest(
		{
			tenantId,
			teamId,
			organizationId,
			role: 'EMPLOYEE'
		},
		access_token
	);

	return $res(data);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	const invitationId = params.id;

	const { searchParams } = new URL(req.url);
	const { action } = searchParams as unknown as { action: string };

	if (!invitationId) {
		return NextResponse.json({}, { status: 400 });
	}

	if (!action) {
		return NextResponse.json({}, { status: 400 });
	}

	const response = await acceptRejectMyInvitationsRequest(
		tenantId,
		access_token,
		invitationId,
		action as MyInvitationActionEnum
	);

	return $res(response.data);
}
