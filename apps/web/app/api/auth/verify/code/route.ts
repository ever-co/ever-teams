import { authFormValidate } from '@/core/lib/helpers/validations';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { verifyUserEmailByCodeRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function POST(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');

	const body = (await req.json()) as unknown as { code: string };

	const { errors, valid: formValid } = authFormValidate(['code'], body as any);

	if (!formValid) {
		return NextResponse.json({ errors });
	}

	try {
		const { data } = await verifyUserEmailByCodeRequest({
			bearer_token: access_token,
			tenantId,
			code: body.code,
			email: user.email || ''
		});
		return $res(data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The address could not be confirmed.');
	}
}
