import { APP_NAME } from '@/core/constants/config/constants';
import { decodeJWT } from '@/core/lib/auth/jwt-utils';
import { setAuthCookies, setNoTeamPopupShowCookie } from '@/core/lib/helpers/cookies';
import { unwrapRejection } from '@/core/services/server/fetch';
import {
	AcceptInviteParams,
	acceptInviteRequest,
	getAllOrganizationTeamRequest,
	getUserOrganizationsRequest,
	switchOrganizationServerRequest,
	verifyInviteCodeRequest
} from '@/core/services/server/requests';
import { IAuthResponse } from '@/core/types/interfaces/auth/auth';
import { IUserOrganization } from '@/core/types/interfaces/organization/user-organization';
import { NextResponse } from 'next/server';

/** The tokens a session is opened with. */
type SessionTokens = Pick<IAuthResponse, 'token' | 'refresh_token'>;

/**
 * Proxy mode twin of Gauzy's public `POST /invite/accept`, sent by the page of the invitation e-mail link. Like the
 * passcode sign-in (`/api/auth/login`), it then reads the invited organization and its first team with the new token
 * and sets the session cookies on its answer, so the invitee is signed in. The body is Gauzy's own answer, as in
 * direct mode, with the tokens of that session.
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
	// Read before the accept, which closes the invitation
	const invitedOrganizationName = await invitedOrganizationNameOf(input);

	// Gauzy builds the links of its welcome e-mail on the Origin of the accept
	const origin = appOriginOf(req);
	const { data: accepted, response: acceptance } = await acceptInviteRequest(input, origin);

	const tenantId = accepted.user?.tenantId || '';
	const userId = accepted.user?.id;

	const { data: organizations } = await getUserOrganizationsRequest({ tenantId, userId }, accepted.token);
	const organization = pickInvitedOrganization(organizations?.items, invitedOrganizationName);
	if (!organization) {
		const message = `Your account is not yet ready to be used on the ${APP_NAME} Platform`;
		return NextResponse.json({ statusCode: 400, message }, { status: 400 });
	}

	const organizationId = organization.organizationId || '';
	const tokens = await tokensInOrganization(accepted, { organizationId, tenantId });
	const access_token = tokens.token;
	const { data: teams } = await getAllOrganizationTeamRequest({ tenantId, organizationId }, access_token);
	const team = teams.items[0];

	// Once the tokens are moved, the accepted refresh token no longer refreshes: the body hands out the session's
	const body = { ...accepted, ...tokens };
	// The cookies go on the response that is returned, or the browser never receives them
	const res = NextResponse.json(body, { status: acceptance.status });
	if (!team) {
		setNoTeamPopupShowCookie(true, { req, res });
	}

	setAuthCookies(
		{
			access_token,
			refresh_token: {
				token: tokens.refresh_token
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

/**
 * The name of the organization the code invites to, from the same Gauzy check the accept page makes before it shows
 * the form. Undefined when that check gives no answer: the accept then checks the code on its own.
 */
async function invitedOrganizationNameOf({ email, code }: AcceptInviteParams): Promise<string | undefined> {
	try {
		const { data: invitation } = await verifyInviteCodeRequest({ email, code });
		return invitation?.organization?.name;
	} catch {
		return undefined;
	}
}

/**
 * The invited organization, else the first one: the pick the accept page makes in direct mode, so a member of several
 * organizations lands in the one they were invited to (tokensInOrganization moves the token there).
 */
function pickInvitedOrganization(
	items: IUserOrganization[] | undefined,
	invitedOrganizationName: string | undefined
): IUserOrganization | undefined {
	if (invitedOrganizationName) {
		const invited = items?.find((item) => item.organization?.name === invitedOrganizationName);
		if (invited) {
			return invited;
		}
	}

	return items?.[0];
}

/**
 * The accepted tokens, moved to the invited organization when Gauzy minted them for another one (a member of several
 * organizations) or for none. Gauzy confines a non-admin to the token's organization, so its teams answer such a token
 * with none of the invited organization's: this is the switch the app makes on load (token-organization.ts), made
 * before the team read. When Gauzy gives no tokens, the accepted ones stay and the app asks again on load.
 */
async function tokensInOrganization(
	accepted: IAuthResponse,
	{ organizationId, tenantId }: { organizationId: string; tenantId: string }
): Promise<SessionTokens> {
	const acceptedTokens = { token: accepted.token, refresh_token: accepted.refresh_token };
	const tokenOrganizationId = decodeJWT(accepted.token)?.organizationId;
	const isInOrganization = !organizationId || tokenOrganizationId === organizationId;
	if (isInOrganization) return acceptedTokens;

	try {
		const { data: switched } = await switchOrganizationServerRequest({ organizationId, tenantId }, accepted.token);
		if (!switched?.token) return acceptedTokens;

		const refresh_token = switched.refresh_token || accepted.refresh_token;
		return { token: switched.token, refresh_token };
	} catch {
		return acceptedTokens;
	}
}

/**
 * The app's origin as the browser sees it: the Origin it posts with, the one Gauzy gets in direct mode. Behind a
 * TLS-terminating proxy the request URL can carry the internal http (cookies/helpers.ts), so it only stands in when
 * the browser sends none, or `null` from a privacy-sensitive context.
 */
function appOriginOf(req: Request): string {
	const sentOrigin = req.headers.get('origin');
	const isUsable = !!sentOrigin && sentOrigin !== 'null';
	if (isUsable) return sentOrigin;

	return new URL(req.url).origin;
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
