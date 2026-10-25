import { APP_NAME } from '@/core/constants/config/constants';
import { pickTokenOrganization } from '@/core/lib/auth/jwt-utils';
import { setAuthCookies, setNoTeamPopupShowCookie } from '@/core/lib/helpers/cookies';
import { unwrapRejection } from '@/core/services/server/fetch';
import {
	AcceptInviteParams,
	acceptInviteRequest,
	getAllOrganizationTeamRequest,
	getUserOrganizationsRequest
} from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

/**
 * Proxy mode twin of Gauzy's public `POST /invite/accept`, sent by the page of the invitation e-mail link. Like the
 * passcode sign-in (`/api/auth/login`), it then reads the organization and the first team with the new token and sets
 * the session cookies on its answer, so the invitee is signed in. The body is Gauzy's own answer, as in direct mode.
 */
export async function POST(req: Request) {
	// The answer signs the browser in: another site can post a form or plain text here without a CORS preflight, but
	// not JSON, so only a JSON body is taken.
	if (!isJsonBody(req)) {
		return NextResponse.json({ statusCode: 415, message: 'Unsupported Media Type' }, { status: 415 });
	}

	const input: AcceptInviteParams | null = await req.json().catch(() => null);
	if (!input) {
		return NextResponse.json({ statusCode: 400, message: 'Bad Request' }, { status: 400 });
	}

	try {
		return await acceptAndSignIn(req, input);
	} catch (error) {
		return failureResponse(error);
	}
}

async function acceptAndSignIn(req: Request, input: AcceptInviteParams) {
	const { data: accepted, response: acceptance } = await acceptInviteRequest(input);

	const tenantId = accepted.user?.tenantId || '';
	const access_token = accepted.token;
	const userId = accepted.user?.id;

	const { data: organizations } = await getUserOrganizationsRequest({ tenantId, userId }, access_token);
	const organization = pickTokenOrganization(organizations?.items, access_token);
	if (!organization) {
		const message = `Your account is not yet ready to be used on the ${APP_NAME} Platform`;
		return NextResponse.json({ statusCode: 400, message }, { status: 400 });
	}

	const organizationId = organization.organizationId || '';
	const { data: teams } = await getAllOrganizationTeamRequest({ tenantId, organizationId }, access_token);
	const team = teams.items[0];

	// The cookies go on the response that is returned, or the browser never receives them
	const res = NextResponse.json(accepted, { status: acceptance.status });
	if (!team) {
		setNoTeamPopupShowCookie(true, { req, res });
	}

	setAuthCookies(
		{
			access_token,
			refresh_token: {
				token: accepted.refresh_token
			},
			teamId: team?.id,
			tenantId,
			organizationId,
			languageId: 'en',
			noTeamPopup: true,
			userId
		},
		{ req, res }
	);

	return res;
}

function isJsonBody(req: Request): boolean {
	const contentType = req.headers.get('content-type') ?? '';
	const [mediaType] = contentType.split(';');
	const normalized = mediaType.trim().toLowerCase();
	return normalized === 'application/json';
}

/**
 * serverFetch rejects a Gauzy refusal with a rejected promise of Gauzy's error body: it goes back with the status it
 * names, else 400, the status of the accept handler's refusals, whose body names none. Anything else (Gauzy
 * unreachable, a body that is not JSON) is a 502.
 */
async function failureResponse(error: unknown) {
	const isRefusal = error instanceof Promise;
	const body = await unwrapRejection(error);
	const hasBody = typeof body === 'object' && body !== null;
	if (!isRefusal || !hasBody) {
		console.error('[WEB][API] POST /invite/accept: no usable answer from the Gauzy API', error);
		return NextResponse.json({ statusCode: 502, message: 'The Gauzy API gave no usable answer' }, { status: 502 });
	}

	const status = refusalStatus(body);
	return NextResponse.json(body, { status });
}

function refusalStatus(body: object): number {
	const statusCode = (body as { statusCode?: unknown }).statusCode;
	if (typeof statusCode !== 'number') return 400;

	const isErrorStatus = statusCode >= 400 && statusCode <= 599;
	if (!isErrorStatus) return 400;

	return statusCode;
}
