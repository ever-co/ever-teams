import { INVITE_CALLBACK_PATH, INVITE_CALLBACK_URL } from '@/core/constants/config/constants';
import { validateForm } from '@/core/lib/helpers/validations';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { resendInvitationEmailRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, organizationId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({}, { status: 401 });

	const url = new URL(req.url);

	const callbackUrl = `${url.origin}${INVITE_CALLBACK_PATH}`;

	const body = (await req.json()) as { inviteId: string };

	const { errors, isValid: formValid } = validateForm(['inviteId'], body);

	if (!formValid) {
		return NextResponse.json({ errors }, { status: 400 });
	}

	const { data } = await resendInvitationEmailRequest(
		{
			tenantId,
			inviteId: body.inviteId,
			inviteType: 'TEAM',
			organizationId,
			callbackUrl: INVITE_CALLBACK_URL || callbackUrl
		},
		access_token
	);

	return $res(data);
}
