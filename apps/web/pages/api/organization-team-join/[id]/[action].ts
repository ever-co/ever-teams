import { IRequestToJoinActionEnum } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { acceptRejectRequestToJoinRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res();

	const { id, action } = req.query;

	switch (req.method) {
		case 'PUT':
			if (id) {
				return $res.json(
					await acceptRejectRequestToJoinRequest({
						id: id as string,
						bearer_token: access_token,
						tenantId,
						action: action as IRequestToJoinActionEnum
					})
				);
			}
			break;
	}
}
