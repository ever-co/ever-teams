import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createFavoriteRequest } from '@/core/services/server/requests';
import { IFavoriteCreateRequest } from '@/core/types/interfaces/common/favorite';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const body = (await req.json()) as IFavoriteCreateRequest;

	const { data } = await createFavoriteRequest({ data: body, bearer_token: access_token, tenantId });

	return $res(data);
}
