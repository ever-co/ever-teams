import {
	JITSI_DOMAIN,
	JITSI_JWT_APP_ID,
	JITSI_JWT_APP_SECRET,
} from '@app/constants';
import {
	// getJitsiJwtSessionCookie,
	setJitsiJwtSessionCookie,
} from '@app/helpers';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard';
import jwt from 'jsonwebtoken';

import { NextApiRequest, NextApiResponse } from 'next';

const algo: jwt.SignOptions = { algorithm: 'HS256' };
type Params = {
	name: string;
	email: string;
	room: string;
	appid: string;
	appkey: string;
	domain: string;
	audience: string;
	avatar: string | null;
	id: string;
};

function generateToken(params: Params): string {
	const payload = {
		context: {
			user: {
				id: params.id,
				avatar: params.avatar,
				name: params.name,
				email: params.email,
			},
		},
		aud: params.audience,
		iss: params.appid,
		sub: params.domain,
		room: params.room,
	};

	return jwt.sign(payload, params.appkey, algo);
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const { $res, user } = await authenticatedGuard(req, res);
	if (!user) return $res();

	if (!JITSI_JWT_APP_SECRET || !JITSI_JWT_APP_ID || !JITSI_DOMAIN) {
		return $res.status(400).json('Invalid configuration !');
	}

	// Check if existing token from cookie is valid
	// const existing_token = getJitsiJwtSessionCookie({ req, res });
	// if (
	// 	existing_token &&
	// 	jwt.verify(existing_token, JITSI_JWT_APP_SECRET, algo)
	// ) {
	// 	return $res.json({ token: existing_token });
	// }

	// Generate new token
	const new_token = generateToken({
		id: user.id,
		name: user.name || user.email.split('@')[0],
		email: user.email,
		avatar: user.imageUrl,
		audience: 'jitsi',
		room: '*',
		domain: JITSI_DOMAIN,
		appid: JITSI_JWT_APP_ID,
		appkey: JITSI_JWT_APP_SECRET,
	});

	setJitsiJwtSessionCookie(new_token, { req, res });

	res.status(200).json({ token: new_token });
}
