import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { getMyProjectRatesRequest } from '@/core/services/server/requests/rates';

export async function GET(req: Request) {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	try {
		const { data } = await getMyProjectRatesRequest({ organizationId, bearer_token: access_token, tenantId });
		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Your project rates could not be read.');
	}
}
