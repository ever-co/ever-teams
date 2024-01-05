import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';

import { editOrganizationProjectsRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res();

	const { id } = req.query;
	switch (req.method) {
		case 'PUT':
			return $res.json(
				await editOrganizationProjectsRequest({
					bearer_token: access_token,
					id,
					datas: req.body,
					tenantId
				})
			);
	}
}
