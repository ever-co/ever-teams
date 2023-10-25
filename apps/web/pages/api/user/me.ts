import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { $res, user } = await authenticatedGuard(req, res);
	if (!user) return $res();

	$res.json({ user });
}
