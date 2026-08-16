import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
	const res = new NextResponse();
	const { user } = await authenticatedGuard(req, res);

	// Session tenant, not the guard's auth-tenant-id cookie: that one is client-writable
	if (!user || !user.tenantId) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const room = req.nextUrl.searchParams.get('roomName')?.trim();

	if (!room) {
		return NextResponse.json({ error: 'Missing or invalid "roomName" query parameter' }, { status: 400 });
	}

	const apiKey = process.env.LIVEKIT_API_KEY;
	const apiSecret = process.env.LIVEKIT_API_SECRET;
	const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

	if (!apiKey || !apiSecret || !wsUrl) {
		console.error('Server misconfigured: missing environment variables.');
		return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
	}

	try {
		const at = new AccessToken(apiKey, apiSecret, { identity: user.email || user.id, ttl: '1h' });
		at.addGrant({
			// Rooms are shared by link, so scoping per tenant keeps a leaked link within its tenant
			room: `${user.tenantId}:${room}`,
			roomJoin: true,
			canPublish: true,
			canSubscribe: true,
			canPublishData: true
		});
		const token = await at.toJwt();
		return NextResponse.json({ token: token });
	} catch (error) {
		console.error('Failed to generate token:', error);
		return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
	}
}
