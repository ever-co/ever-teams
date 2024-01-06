import { MEET_DOMAIN, MEET_JWT_APP_ID, MEET_JWT_APP_SECRET } from '@app/constants';
// import {
// 	// getMeetJwtSessionCookie,
// 	setMeetJwtSessionCookie,
// } from '@app/helpers';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import jwt from 'jsonwebtoken';

import { NextResponse } from 'next/server';

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
				email: params.email
			}
		},
		aud: params.audience,
		iss: params.appid,
		sub: params.domain,
		room: params.room
	};

	return jwt.sign(payload, params.appkey, algo);
}

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	if (!MEET_JWT_APP_SECRET || !MEET_JWT_APP_ID || !MEET_DOMAIN) {
		return $res('Invalid configuration !');
	}

	// Check if existing token from cookie is valid
	// const existing_token = getMeetJwtSessionCookie({ req, res });
	// if (
	// 	existing_token &&
	// 	jwt.verify(existing_token, MEET_JWT_APP_SECRET, algo)
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
		domain: MEET_DOMAIN.value,
		appid: MEET_JWT_APP_ID,
		appkey: MEET_JWT_APP_SECRET
	});

	// We don't use this cookie for now
	// setMeetJwtSessionCookie(new_token, { req, res });

	NextResponse.json({ token: new_token });
}
