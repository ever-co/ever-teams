import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { createUserApiTokenRequest, getUserApiTokensRequest } from '@/core/services/server/requests/user-api-tokens';
import {
	createdUserApiTokenSchema,
	createUserApiTokenInputSchema,
	userApiTokenListSchema
} from '@/core/types/schemas/user/user-api-token.schema';

const UNREADABLE_LIST_MESSAGE = 'Your API tokens could not be read.';
const NOT_CREATED_MESSAGE = 'The API token could not be created.';

/**
 * Whether the request says it carries JSON. The session comes from a cookie, which a browser attaches to a request
 * another site makes: such a site can post text, form data or an untyped body without a CORS preflight, but not JSON
 * (as forwardToGauzy refuses them).
 */
function isJsonRequest(req: Request): boolean {
	const mediaType = req.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
	return mediaType === 'application/json';
}

/** A token's secret is answered once: no cache on the way may keep it. */
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store', Pragma: 'no-cache' };

/**
 * Proxy mode twin of Gauzy's `GET /user-api-tokens`: the caller's own tokens that are not revoked. Gauzy refuses with
 * its 404 while the server has the tokens off; the owner's ids stay on the server.
 */
export async function GET(req: Request) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	try {
		const { data } = await getUserApiTokensRequest({ bearer_token: access_token, tenantId });
		const parsed = userApiTokenListSchema.safeParse(data);
		if (!parsed.success) {
			return NextResponse.json({ message: UNREADABLE_LIST_MESSAGE }, { status: 502 });
		}
		return $res(parsed.data);
	} catch (error) {
		return gauzyErrorResponse(error, UNREADABLE_LIST_MESSAGE);
	}
}

/**
 * Proxy mode twin of Gauzy's `POST /user-api-tokens`: creates a token for the caller from a name and an expiry, and
 * answers its secret this once. Gauzy refuses an eleventh working token with a 400 that says so.
 */
export async function POST(req: Request) {
	// Before the session is read: another site's post never gets as far as creating a token
	if (!isJsonRequest(req)) {
		return NextResponse.json({ statusCode: 415, message: 'Unsupported Media Type' }, { status: 415 });
	}
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	if (!user) return $res('Unauthorized');

	const body: unknown = await req.json().catch(() => null);
	const parsedBody = createUserApiTokenInputSchema.safeParse(body);
	if (!parsedBody.success) {
		return NextResponse.json(
			{ message: 'A name of 1 to 100 characters and an expiry of 90d, 1y or never are required' },
			{ status: 400 }
		);
	}

	try {
		const { data } = await createUserApiTokenRequest({
			input: parsedBody.data,
			bearer_token: access_token,
			tenantId
		});
		const created = createdUserApiTokenSchema.safeParse(data);
		if (!created.success) {
			return NextResponse.json({ message: NOT_CREATED_MESSAGE }, { status: 502, headers: NO_STORE_HEADERS });
		}
		return NextResponse.json(created.data, { status: 201, headers: NO_STORE_HEADERS });
	} catch (error) {
		return gauzyErrorResponse(error, NOT_CREATED_MESSAGE);
	}
}
