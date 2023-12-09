import { healthCheckRequest } from '@app/services/server/requests';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { data } = await healthCheckRequest();

	res.send(data);
}
