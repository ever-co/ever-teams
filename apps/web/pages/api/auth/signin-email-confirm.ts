import { authFormValidate } from '@app/helpers/validations';
import { signInEmailConfirmRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ status: 'fail' });
	}

	const body = req.body as { email: string; code: string };

	const { errors, valid: formValid } = authFormValidate(
		['email', 'code'],
		body as any
	);

	if (!formValid) {
		return res.status(400).json({ errors });
	}

	const { data } = await signInEmailConfirmRequest({
		code: body.code,
		email: body.email,
	});

	res.json(data);
}
