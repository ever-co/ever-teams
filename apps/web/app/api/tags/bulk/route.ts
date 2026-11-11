import { NextResponse } from 'next/server';
import { apiErrorStatusOf, unwrapRejection } from '@/core/services/server/fetch';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createLabelsBulkRequest } from '@/core/services/server/requests/task-labels';
import { ITagCreate } from '@/core/types/interfaces/tag/tag';

/** The proxy-mode twin of Gauzy's `POST /tags/bulk`: the items as the client sent them, one outcome per item back. */
export async function POST(req: Request) {
	const res = new NextResponse();
	const body = (await req.json()) as { items?: ITagCreate[] };

	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	try {
		const response = await createLabelsBulkRequest(body?.items ?? [], access_token || '', tenantId);

		return $res(response.data);
	} catch (error) {
		// Gauzy's refusal goes back with its status, not as a 500: an API without the bulk route answers 404, which
		// tells the client to file the labels one by one. Anything else is rethrown.
		const apiError = await unwrapRejection(error);
		const apiStatus = apiErrorStatusOf(apiError);
		if (apiStatus === undefined) {
			throw error;
		}
		return NextResponse.json(apiError, { status: apiStatus });
	}
}
