import { VERIFY_EMAIL_CALLBACK_PATH } from '@/core/constants/config/constants';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { resentVerifyUserLinkRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { refuseForeignOrigin } from '@/core/services/server/same-origin-request';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function POST(req: Request) {
	const foreign = refuseForeignOrigin(req);
	if (foreign) return foreign;
	const res = new NextResponse();
	const url = new URL(req.url);

	const appEmailConfirmationUrl = `${url.origin}${VERIFY_EMAIL_CALLBACK_PATH}`;

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) {
		return $res('Unauthorized');
	}

	try {
		const { data } = await resentVerifyUserLinkRequest({
			bearer_token: access_token,
			tenantId,
			email: user.email || '',
			appEmailConfirmationUrl
		});
		return $res(data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The confirmation email could not be sent again.');
	}
}
