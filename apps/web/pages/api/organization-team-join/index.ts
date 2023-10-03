import { IRequestToJoinCreate } from '@app/interfaces';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import {
	getRequestToJoinRequest,
	requestToJoinRequest
} from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	switch (req.method) {
		case 'GET':
			/* eslint-disable no-case-declarations */
			const { access_token, tenantId, organizationId } =
				await authenticatedGuard(req, res);

			/* eslint-disable no-case-declarations */
			const requestToJoinData = await getRequestToJoinRequest({
				bearer_token: access_token,
				tenantId,
				organizationId
			});
			return res.json(requestToJoinData.data);
		case 'POST':
			/* eslint-disable no-case-declarations */
			const body = req.body as IRequestToJoinCreate;
			return res.json(await requestToJoinRequest(body));
	}
}
