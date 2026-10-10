import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { deleteFavoriteRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { data } = await deleteFavoriteRequest({ id, bearer_token: access_token, tenantId });

	return $res(data);
}
