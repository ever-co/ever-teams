import { IRequestToJoinCreate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	getRequestToJoinRequest,
	requestToJoinRequest,
} from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	switch (req.method) {
		case 'GET':
			const { access_token, tenantId, organizationId } =
				await authenticatedGuard(req, res);

			const requestToJoinData = await getRequestToJoinRequest({
				bearer_token: access_token,
				tenantId,
				organizationId,
			});
			return res.json(requestToJoinData.data);
		case 'POST':
			const body = req.body as IRequestToJoinCreate;
			return res.json(await requestToJoinRequest(body));
	}
}
