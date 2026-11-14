import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getUserApiTokenConfigRequest } from '@/core/services/server/requests/user-api-tokens';
import { userApiTokenConfigSchema } from '@/core/types/schemas/user/user-api-token.schema';

const UNREADABLE_MESSAGE = 'Whether this server offers API tokens could not be read.';

/**
 * Proxy mode twin of Gauzy's `GET /user-api-tokens/config`: whether the server has personal API tokens on. An API
 * that has no such route answers its 404, which the settings read as "not offered".
 */
export async function GET(req: Request) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	try {
		const { data } = await getUserApiTokenConfigRequest({ bearer_token: access_token, tenantId });
		const parsed = userApiTokenConfigSchema.safeParse(data);
		if (!parsed.success) {
			return NextResponse.json({ message: UNREADABLE_MESSAGE }, { status: 502 });
		}
		return $res(parsed.data);
	} catch (error) {
		return gauzyErrorResponse(error, UNREADABLE_MESSAGE);
	}
}
