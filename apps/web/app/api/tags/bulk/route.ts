import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiErrorStatusOf, unwrapRejection } from '@/core/services/server/fetch';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createLabelsBulkRequest } from '@/core/services/server/requests/task-labels';
import { tagCreateSchema } from '@/core/types/schemas/tag/tag.schema';

/** Each item is a label as `POST /tags` takes it; Gauzy's tag bulk route files 1 to 200 items per request. */
const bulkBody = z.object({ items: z.array(tagCreateSchema).min(1).max(200) });

/** The proxy-mode twin of Gauzy's `POST /tags/bulk`: the items as the client sent them, one outcome per item back. */
export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	const body = bulkBody.safeParse(await req.json().catch(() => null));
	if (!body.success) {
		return NextResponse.json({ error: 'items must be a list of 1 to 200 labels' }, { status: 400 });
	}

	try {
		const response = await createLabelsBulkRequest(body.data.items, access_token || '', tenantId);

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
