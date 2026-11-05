import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { getProjectRatesRequest } from '@/core/services/server/requests/rates';
import { rateRouteIdSchema } from '@/core/lib/validation/rates';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const parsedId = rateRouteIdSchema.safeParse((await params).id);
	if (!parsedId.success) {
		return NextResponse.json({ message: 'A project id is required' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	try {
		const { data } = await getProjectRatesRequest({
			projectId: parsedId.data,
			organizationId,
			bearer_token: access_token,
			tenantId
		});
		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'The project rates could not be read.');
	}
}
