import { INVITE_CALLBACK_PATH, INVITE_CALLBACK_URL } from '@app/constants';
import { validateForm } from '@app/helpers/validations';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { resendInvitationEmailRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, access_token, tenantId, organizationId } =
		await authenticatedGuard(req, res);
	if (!user) return $res();

	const callbackUrl = `${req.headers.origin}${INVITE_CALLBACK_PATH}`;

	const body = req.body as { inviteId: string };

	const { errors, isValid: formValid } = validateForm(['inviteId'], body);

	if (!formValid) {
		return res.status(400).json({ errors });
	}

	const { data } = await resendInvitationEmailRequest(
		{
			tenantId,
			inviteId: body.inviteId,
			inviteType: 'TEAM',
			organizationId,
			callbackUrl: INVITE_CALLBACK_URL || callbackUrl
		},
		access_token
	);

	$res.json(data);
}
