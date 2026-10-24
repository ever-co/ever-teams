import { MEET_DOMAIN, MEET_JWT_APP_ID, MEET_JWT_APP_SECRET } from '@/core/constants/config/constants';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import jwt from 'jsonwebtoken';

import { NextResponse } from 'next/server';

// Jitsi checks a token when the participant joins, not during the meeting: the expiry only bounds a leaked token
const TOKEN_TTL = '1h';

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

	return jwt.sign(payload, params.appkey, { algorithm: 'HS256', expiresIn: TOKEN_TTL });
}

/**
 * The Jitsi room a meeting link opens for a tenant. Jitsi lowercases and URI-encodes room names before
 * matching them against the token, so the name keeps only characters both leave unchanged (accents dropped,
 * the rest turned into "-"). The tenant follows the first "_", which the name part never contains, so no
 * room name can reach another tenant's room.
 */
function tenantRoomName(tenantId: string, room: string) {
	const name = room
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return name ? `${name}_${tenantId.toLowerCase()}` : null;
}

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	// Session tenant, not the guard's auth-tenant-id cookie: that one is client-writable
	if (!user.tenantId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const room = tenantRoomName(user.tenantId, new URL(req.url).searchParams.get('room') ?? '');
	if (!room) {
		return NextResponse.json({ error: 'Missing or invalid "room" query parameter' }, { status: 400 });
	}

	if (!MEET_JWT_APP_SECRET || !MEET_JWT_APP_ID || !MEET_DOMAIN.value) {
		console.error('Server misconfigured: missing Jitsi meet environment variables.');
		return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
	}

	// The token opens this one room only: a '*' room would let any signed-in user join every tenant's meetings
	const token = generateToken({
		id: user.id,
		name: user.name || user.email?.split('@')[0] || '',
		email: user.email || '',
		avatar: user.imageUrl || null,
		audience: 'jitsi',
		room,
		domain: MEET_DOMAIN.value,
		appid: MEET_JWT_APP_ID,
		appkey: MEET_JWT_APP_SECRET
	});

	return NextResponse.json({ token, room });
}
