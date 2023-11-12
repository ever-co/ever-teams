import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		throw new Error('Sentry Example API Route Error');
	} catch (error) {
		return res.status(500).json({ error: (error as Error)?.message });
	}
}
