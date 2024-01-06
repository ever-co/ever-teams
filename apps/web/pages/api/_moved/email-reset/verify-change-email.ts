import { ICode } from '@app/interfaces/IUserData';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { verifyChangemailRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res();

	const { code } = req.body as ICode;

	switch (req.method) {
		case 'POST':
			return $res.json(
				await verifyChangemailRequest({
					code,
					tenantId,
					bearer_token: access_token
				})
			);
	}
}
