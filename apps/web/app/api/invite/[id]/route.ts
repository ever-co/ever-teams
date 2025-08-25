/* eslint-disable no-case-declarations */
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import {
	getTeamInvitationsRequest,
	removeTeamInvitationsRequest,
	getMyInvitationsRequest,
	acceptRejectMyInvitationsRequest
} from '@/core/services/server/requests';
import { EInviteAction } from '@/core/types/generics/enums/invite';
import { NextResponse } from 'next/server';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const res = new NextResponse();
	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	const { data } = await getMyInvitationsRequest(tenantId || '', access_token || '');

	return $res(data);
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const res = new NextResponse();
	const invitationId = params.id;

	if (!invitationId) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId, organizationId, teamId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	await removeTeamInvitationsRequest({
		bearer_token: access_token || '',
		tenantId: tenantId || '',
		invitationId
	});

	const { data } = await getTeamInvitationsRequest(
		{
			tenantId: tenantId || '',
			teamId: teamId || '',
			organizationId: organizationId || ''
			// Get all invitations regardless of role
		},
		access_token || ''
	);

	return $res(data);
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
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
		tenantId || '',
		access_token || '',
		invitationId,
		action as EInviteAction
	);

	return $res(response.data);
}
