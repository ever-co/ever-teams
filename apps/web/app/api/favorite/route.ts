import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createFavoriteRequest } from '@/core/services/server/requests';
import { IFavoriteCreateRequest } from '@/core/types/interfaces/common/favorite';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function POST(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	// The guard's own status: 401 for a refused session, 503 when Gauzy could not answer (no logout then)
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as IFavoriteCreateRequest;

	try {
		const { data } = await createFavoriteRequest({ data: body, bearer_token: access_token, tenantId });
		return $res(data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The favorite could not be created.');
	}
}
