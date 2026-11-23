/* eslint-disable no-case-declarations */
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import {
	getAllTeamInvitationsRequest,
	removeTeamInvitationsRequest,
	getMyInvitationsRequest,
	acceptRejectMyInvitationsRequest
} from '@/core/services/server/requests';
import { EInviteAction } from '@/core/types/generics/enums/invite';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const res = new NextResponse();
	if (!params.id) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: status ?? 401 });

	try {
		const { data } = await getMyInvitationsRequest(tenantId || '', access_token || '');
		return $res(data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The invitations could not be read.');
	}
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const params = await props.params;
	const res = new NextResponse();
	const invitationId = params.id;

	if (!invitationId) {
		return NextResponse.json({}, { status: 400 });
	}

	const { $res, user, access_token, tenantId, organizationId, teamId, status } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: status ?? 401 });

	try {
		await removeTeamInvitationsRequest({
			bearer_token: access_token || '',
			tenantId: tenantId || '',
			invitationId
		});
		// WORKAROUND: Use combined request to get all invitations (EMPLOYEE + non-EMPLOYEE)
		const { data } = await getAllTeamInvitationsRequest(
			{
				tenantId: tenantId || '',
				teamId: teamId || '',
				organizationId: organizationId || ''
			},
			access_token || ''
		);
		return $res(data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The invitation could not be removed.');
	}
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const params = await props.params;
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: status ?? 401 });

	const invitationId = params.id;

	const { searchParams } = new URL(req.url);
	const action = searchParams.get('action');

	if (!invitationId) {
		return NextResponse.json({}, { status: 400 });
	}

	if (!action) {
		return NextResponse.json({}, { status: 400 });
	}

	// The action becomes a path segment of the Gauzy request, so only the known values are forwarded
	const inviteActions: string[] = Object.values(EInviteAction);
	const isInviteAction = inviteActions.includes(action);

	if (!isInviteAction) {
		return NextResponse.json({}, { status: 400 });
	}

	try {
		const response = await acceptRejectMyInvitationsRequest(
			tenantId || '',
			access_token || '',
			invitationId,
			action as EInviteAction
		);
		return $res(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The invitation could not be answered.');
	}
}
