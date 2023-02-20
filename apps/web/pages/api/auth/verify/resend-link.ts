import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { resentVerifyUserLinkRequest } from '@app/services/server/requests';
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

	const { data } = await resentVerifyUserLinkRequest({
		bearer_token: access_token,
		tenantId,
		email: user.email,
	});

	$res.json(data);
}
