import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getLanguageListRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request) {
	const res = new NextResponse();
	const { $res, user, access_token, tenantId, status } = await authenticatedGuard(req, res);

	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: status ?? 401 });

	const par = {
		is_system: user.role?.isSystem as boolean,
		tenantId
	};

	try {
		const { data } = await getLanguageListRequest(par, access_token);
		return $res(data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The list of languages could not be read.');
	}
}
