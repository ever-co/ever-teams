import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { requestRateChangeRequest } from '@/core/services/server/requests/rates';
import { rateChangeRequestBodySchema } from '@/core/lib/validation/rates';

export async function POST(req: Request) {
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	const body: unknown = await req.json().catch(() => null);
	const parsedBody = rateChangeRequestBodySchema.safeParse(body);
	if (!parsedBody.success) {
		return NextResponse.json({ message: 'A requested rate is a number of 0 or more' }, { status: 400 });
	}

	try {
		const { data } = await requestRateChangeRequest({
			input: parsedBody.data,
			organizationId,
			bearer_token: access_token,
			tenantId
		});
		return NextResponse.json(data, { status: 202 });
	} catch (error) {
		return gauzyErrorResponse(error, 'The rate change request could not be sent.');
	}
}
