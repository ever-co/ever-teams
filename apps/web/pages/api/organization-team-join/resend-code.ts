import { IRequestToJoinCreate } from '@app/interfaces';
import { resendCodeRequestToJoinRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const body = req.body as IRequestToJoinCreate;

	switch (req.method) {
		case 'POST':
			return res.json(await resendCodeRequestToJoinRequest(body));
	}
}
