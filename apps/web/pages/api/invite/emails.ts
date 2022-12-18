import { INVITE_CALLBACK_URL } from '@app/constants';
import { validateForm } from '@app/helpers/validations';
import { IInviteRequest } from '@app/interfaces/IInvite';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	getEmployeeRoleRequest,
	getTeamInvitationsRequest,
	inviteByEmailsRequest,
} from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, organizationId, access_token, teamId, tenantId } =
		await authenticatedGuard(req, res);
	if (!user) return $res();

	const body = req.body as IInviteRequest;

	const { errors, isValid: formValid } = validateForm(['email', 'name'], body);

	if (!formValid) {
		return res.status(400).json({ errors });
	}

	const { data: employeeRole } = await getEmployeeRoleRequest({
		tenantId,
		role: 'EMPLOYEE',
		bearer_token: access_token,
	});

	await inviteByEmailsRequest(
		{
			startedWorkOn: new Date().toISOString(),
			tenantId,
			organizationId,
			emailIds: [body.email],
			roleId: employeeRole?.id || '',
			invitationExpirationPeriod: 'Never',
			inviteType: 'TEAM',
			invitedById: user.id,
			teamIds: [teamId],
			projectIds: [teamId],
			fullName: body.name,
			...(INVITE_CALLBACK_URL ? { callbackUrl: INVITE_CALLBACK_URL } : {}),
		},
		access_token
	);

	const { data } = await getTeamInvitationsRequest(
		{
			tenantId,
			teamId,
			organizationId,
			role: 'EMPLOYEE',
		},
		access_token
	);

	$res.status(200).json(data);
}
