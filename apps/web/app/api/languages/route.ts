import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getLanguageListRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const par = {
		is_system: user.role?.isSystem as boolean,
		tenantId
	};

	const { data } = await getLanguageListRequest(par, access_token);

	return $res(data);
}
