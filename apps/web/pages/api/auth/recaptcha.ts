import { RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY } from '@app/constants';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== 'GET') {
		return res.status(405).json({ status: 'fail' });
	}

	res.status(200).json({
		RECAPTCHA_SITE_KEY: RECAPTCHA_SITE_KEY,
		RECAPTCHA_SECRET_KEY: !!RECAPTCHA_SECRET_KEY // Must remain private
	});
}
