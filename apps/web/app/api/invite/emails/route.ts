import { INVITE_CALLBACK_URL, INVITE_CALLBACK_PATH } from '@/core/constants/config/constants';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import {
	getEmployeeRoleRequest,
	getAllTeamInvitationsRequest,
	inviteByEmailsRequest
} from '@/core/services/server/requests';
import { inviteEmailsBodySchema, MAX_EMAILS_PER_INVITE } from '@/core/lib/validation/invite';
import { NextResponse } from 'next/server';

const INVALID_INVITE_MESSAGE = `Send 1 to ${MAX_EMAILS_PER_INVITE} valid email addresses, and a valid role id when a role is picked`;

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, organizationId, access_token, teamId, tenantId, status } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({ errors: 'Unauthorized' }, { status: status ?? 401 });

	const { origin } = new URL(req.url);

	const callbackUrl = `${origin}${INVITE_CALLBACK_PATH}`;

	const requestBody: unknown = await req.json().catch(() => null);
	const parsed = inviteEmailsBodySchema.safeParse(requestBody);
	if (!parsed.success) {
		return NextResponse.json({ errors: { email: INVALID_INVITE_MESSAGE } }, { status: 400 });
	}

	// The role the inviter picked; Gauzy refuses one above the inviter's own. Without a choice, the employee role.
	let roleId = parsed.data.roleId;
	if (!roleId) {
		const { data: employeeRole } = await getEmployeeRoleRequest({
			tenantId,
			role: 'EMPLOYEE',
			bearer_token: access_token
		});
		roleId = employeeRole?.id || '';
	}

	const date = new Date();
	date.setDate(date.getDate() - 1);

	await inviteByEmailsRequest(
		{
			emailIds: parsed.data.emails,
			projectIds: [],
			departmentIds: [],
			organizationContactIds: [],
			teamIds: [teamId],
			roleId,
			invitationExpirationPeriod: 'Never',
			inviteType: 'TEAM',
			appliedDate: null,
			callbackUrl: INVITE_CALLBACK_URL || callbackUrl,
			organizationId,
			tenantId,
			startedWorkOn: date.toISOString()
		},
		access_token
	);

	// WORKAROUND: Use combined request to get all invitations (EMPLOYEE + non-EMPLOYEE)
	// This is needed due to Gauzy API bug where no role filter excludes EMPLOYEE by default
	const { data } = await getAllTeamInvitationsRequest(
		{
			tenantId,
			teamId,
			organizationId
		},
		access_token
	);

	return $res(data);
}
