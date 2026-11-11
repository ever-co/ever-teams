import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createLabelsBulkRequest } from '@/core/services/server/requests/task-labels';
import { ITagCreate } from '@/core/types/interfaces/tag/tag';

/** The proxy-mode twin of Gauzy's `POST /tags/bulk`: the items as the client sent them, one outcome per item back. */
export async function POST(req: Request) {
	const res = new NextResponse();
	const body = (await req.json()) as { items?: ITagCreate[] };

	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	const response = await createLabelsBulkRequest(body?.items ?? [], access_token || '', tenantId);

	return $res(response.data);
}
