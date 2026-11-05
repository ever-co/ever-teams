import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { updateOwnProfileRatesRequest } from '@/core/services/server/requests/rates';
import { ownProfileRatesBodySchema, rateRouteIdSchema } from '@/core/lib/validation/rates';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
	const parsedId = rateRouteIdSchema.safeParse((await params).id);
	if (!parsedId.success) {
		return NextResponse.json({ message: 'An employee id is required' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	const body: unknown = await req.json().catch(() => null);
	const parsedBody = ownProfileRatesBodySchema.safeParse(body);
	if (!parsedBody.success) {
		return NextResponse.json({ message: 'A rate is a number of 0 or more, or null' }, { status: 400 });
	}

	try {
		const { data } = await updateOwnProfileRatesRequest({
			employeeId: parsedId.data,
			rates: parsedBody.data,
			bearer_token: access_token,
			tenantId,
			organizationId
		});
		return $res(data);
	} catch (error) {
		return gauzyErrorResponse(error, 'Your rates could not be saved.');
	}
}
