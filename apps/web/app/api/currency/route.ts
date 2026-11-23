import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getCurrenciesRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());

	// The guard's own status: 401 for a refused session, 503 when Gauzy could not answer (no logout then)
	if (!user) return $res('Unauthorized');

	try {
		const { data } = await getCurrenciesRequest({ bearer_token: access_token, tenantId });
		return $res(data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The list of currencies could not be read.');
	}
}
