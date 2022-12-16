import { validateForm } from '@app/helpers/validations';
import { IInviteVerifyCode } from '@app/interfaces/IInvite';
import { verifyInviteCodeRequest } from '@app/services/server/requests';

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const body = req.body as IInviteVerifyCode;

	const { errors, isValid: formValid } = validateForm(
		['code', 'email'],
		body as any
	);

	if (!formValid) {
		return res.status(400).json({ errors });
	}

	const { data } = await verifyInviteCodeRequest(body);

	res.status(200).json(data);
}
