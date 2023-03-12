import { IEmail } from '@app/interfaces/IUserData';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { emailResetRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(
		req,
		res
	);
	if (!user) return $res();

	const { email } = req.body as IEmail;

	switch (req.method) {
		case 'POST':
			return $res.json(
				await emailResetRequest({
					email,
					tenantId,
					bearer_token: access_token,
				})
			);
	}
}
