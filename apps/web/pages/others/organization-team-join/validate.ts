import { IValidateRequestToJoin } from '@app/interfaces';
import { validateRequestToJoinRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const body = req.body as IValidateRequestToJoin;

	switch (req.method) {
		case 'POST':
			return res.json(await validateRequestToJoinRequest(body));
	}
}
