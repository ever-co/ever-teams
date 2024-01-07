import { IEmail } from '@app/interfaces/IUserData';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { emailResetRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

	const { email } = (await req.json()) as IEmail;

	return $res(
		await emailResetRequest({
			email,
			tenantId,
			bearer_token: access_token
		})
	);
}
