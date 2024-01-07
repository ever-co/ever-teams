import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getLanguageListRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const par = {
		is_system: user.role.isSystem as boolean,
		tenantId
	};

	return $res(await getLanguageListRequest(par, access_token));
}
