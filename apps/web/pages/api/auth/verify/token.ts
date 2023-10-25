import { authFormValidate } from '@app/helpers/validations';
import { verifyUserEmailByTokenRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'POST') {
		return res.status(405).json({ status: 'fail' });
	}

	const body = req.body as { email: string; token: string };

	const { errors, valid: formValid } = authFormValidate(['email', 'token'], body as any);

	if (!formValid) {
		return res.status(400).json({ errors });
	}

	const { data } = await verifyUserEmailByTokenRequest({
		token: body.token,
		email: body.email
	});

	res.status(200).json(data);
}
