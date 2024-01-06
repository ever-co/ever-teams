import { VERIFY_EMAIL_CALLBACK_PATH } from '@app/constants';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { resentVerifyUserLinkRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const url = new URL(req.url);

	const appEmailConfirmationUrl = `${url.origin}${VERIFY_EMAIL_CALLBACK_PATH}`;

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	const { data } = await resentVerifyUserLinkRequest({
		bearer_token: access_token,
		tenantId,
		email: user.email,
		appEmailConfirmationUrl
	});

	$res(data);
}
