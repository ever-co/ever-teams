import { authFormValidate } from '@app/helpers/validations';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { verifyUserEmailByCodeRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	if (req.method !== 'POST') {
		return res.status(405).json({ status: 'fail' });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(
		req,
		res
	);

	if (!user) return $res();

	const body = req.body as { code: string };

	const { errors, valid: formValid } = authFormValidate(['code'], body as any);

	if (!formValid) {
		return res.status(400).json({ errors });
	}

	const { data } = await verifyUserEmailByCodeRequest({
		bearer_token: access_token,
		tenantId,
		code: parseInt(body.code, 10),
		email: user.email,
	});

	$res.json(data);
}
