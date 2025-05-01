import { authFormValidate } from '@/core/lib/helpers/validations';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { verifyUserEmailByCodeRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return $res('unauthorized');

	const body = (await req.json()) as unknown as { code: string };

	const { errors, valid: formValid } = authFormValidate(['code'], body as any);

	if (!formValid) {
		return NextResponse.json({ errors });
	}

	const { data } = await verifyUserEmailByCodeRequest({
		bearer_token: access_token,
		tenantId,
		code: body.code,
		email: user.email
	});

	return $res(data);
}
