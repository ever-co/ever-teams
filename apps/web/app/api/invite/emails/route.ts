import { INVITE_CALLBACK_URL, INVITE_CALLBACK_PATH } from '@app/constants';
import { validateForm } from '@app/helpers/validations';
import { IInviteRequest } from '@app/interfaces/IInvite';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import {
	getEmployeeRoleRequest,
	getTeamInvitationsRequest,
	inviteByEmailsRequest
} from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, organizationId, access_token, teamId, tenantId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({ errors: 'Unauthorized' }, { status: 401 });

	const { origin } = new URL(req.url);

	const callbackUrl = `${origin}${INVITE_CALLBACK_PATH}`;

	const body = (await req.json()) as IInviteRequest;

	const { errors, isValid: formValid } = validateForm(['email', 'name'], body);

	if (!formValid) {
		return NextResponse.json({ errors }, { status: 400 });
	}

	const { data: employeeRole } = await getEmployeeRoleRequest({
		tenantId,
		role: 'EMPLOYEE',
		bearer_token: access_token
	});

	const date = new Date();
	date.setDate(date.getDate() - 1);

	await inviteByEmailsRequest(
		{
			emailIds: [body.email],
			projectIds: [],
			departmentIds: [],
			organizationContactIds: [],
			teamIds: [teamId],
			roleId: employeeRole?.id || '',
			invitationExpirationPeriod: 'Never',
			inviteType: 'TEAM',
			appliedDate: null,
			fullName: body.name,
			callbackUrl: INVITE_CALLBACK_URL || callbackUrl,
			organizationId,
			tenantId,
			startedWorkOn: date.toISOString()
		},
		access_token
	);

	const { data } = await getTeamInvitationsRequest(
		{
			tenantId,
			teamId,
			organizationId,
			role: 'EMPLOYEE'
		},
		access_token
	);

	$res(data);
}
