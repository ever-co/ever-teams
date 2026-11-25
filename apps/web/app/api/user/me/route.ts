import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { NextResponse } from 'next/server';
import { requestAsksFreshUserRead } from '@/core/lib/utils/fresh-user-read';

export async function GET(req: Request) {
	const res = new NextResponse();
	// After a profile save the browser asks for a check made anew: another instance of this server may still keep
	// the user as they were before it (#5728)
	const fresh = requestAsksFreshUserRead(req.url);
	const { $res, user } = await authenticatedGuard(req, res, { fresh });
	if (!user) return $res('Unauthorized');

	return $res(user);
}
