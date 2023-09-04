import { INVITE_CALLBACK_PATH } from '@app/constants';
import { authFormValidate } from '@app/helpers/validations';
import { signInEmailRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ status: 'fail' });
	}

	const callbackUrl = `${req.headers.origin}${INVITE_CALLBACK_PATH}`;

	const body = req.body as { email: string };

	const { errors, valid: formValid } = authFormValidate(['email'], body as any);

	if (!formValid) {
		return res.status(400).json({ errors });
	}

	const codeSendRes = await signInEmailRequest(body.email, callbackUrl).catch(
		() => void 0
	);

	if (!codeSendRes) {
		return res.status(400).json({
			errors: {
				email: "We couldn't find any account associated to this email",
			},
		});
	}

	res.status(200).json(codeSendRes.data);
}
