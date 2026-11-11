import { NextResponse } from 'next/server';
import { ACTIVE_LANGUAGE_COOKIE_NAME, ACTIVE_TIMEZONE_COOKIE_NAME } from '@/core/constants/config/constants';
import { createWorkspaceBodySchema } from '@/core/lib/validation/workspace';
import { createWorkspace } from '@/core/services/server/create-workspace';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { requestCookies } from '@/core/services/server/request-cookies';

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * `POST /api/auth/create-workspace` (#5025): another workspace for the signed-in person, its first team and the
 * members invited to it, then signs them in to it (the session cookies of the answer); the page reloads into it.
 * Always this app's own route, in direct mode too: the steps run with the new workspace's session, which the
 * browser never holds before the cookies.
 *
 * Answers 201 with the invitations sent, 400 for an invalid body, 403 with `code` ADDRESS_UNCONFIRMED (the address
 * must be confirmed first), REGISTRATION_CLOSED (the operator allows no new workspace) or SUBSCRIPTION_REQUIRED (the
 * sign-up's paywall; `details.checkoutUrl` is where to buy the product), 502 with `code`
 * CREATED_NOT_OPENED (the workspace and its team exist, but its session could not be opened) or FAILED (a step before
 * the first team failed).
 */
export async function POST(req: Request) {
	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, new NextResponse());
	// The guard's own status: 401 for a refused session, 503 when Gauzy could not answer
	if (!user) return $res('Unauthorized');

	const parsed = createWorkspaceBodySchema.safeParse(await req.json().catch(() => null));
	if (!parsed.success) {
		return NextResponse.json({ code: 'INVALID' }, { status: 400, headers: NO_STORE });
	}
	// Gauzy refuses an unconfirmed address too; the session says so without a round trip
	if ((user as { isEmailVerified?: boolean }).isEmailVerified === false) {
		return NextResponse.json({ code: 'ADDRESS_UNCONFIRMED' }, { status: 403, headers: NO_STORE });
	}

	const cookies = requestCookies(req);
	const session = new NextResponse();
	const result = await createWorkspace({
		req,
		response: session,
		accessToken: access_token,
		tenantId,
		name: parsed.data.name,
		teamName: parsed.data.teamName ?? parsed.data.name,
		invites: parsed.data.invites,
		languageId: cookies.get(ACTIVE_LANGUAGE_COOKIE_NAME),
		timezone: cookies.get(ACTIVE_TIMEZONE_COOKIE_NAME)
	});

	switch (result.status) {
		case 'ok': {
			const created = NextResponse.json(
				{ invited: result.invited, invitesFailed: result.invitesFailed },
				{ status: 201, headers: NO_STORE }
			);
			// The new workspace's session, set on the answer
			for (const cookie of session.cookies.getAll()) {
				created.cookies.set(cookie);
			}
			return created;
		}
		case 'address_unconfirmed':
			return NextResponse.json({ code: 'ADDRESS_UNCONFIRMED' }, { status: 403, headers: NO_STORE });
		case 'registration_closed':
			return NextResponse.json({ code: 'REGISTRATION_CLOSED' }, { status: 403, headers: NO_STORE });
		case 'subscription_required':
			return NextResponse.json(
				{
					code: 'SUBSCRIPTION_REQUIRED',
					...(result.checkoutUrl ? { details: { checkoutUrl: result.checkoutUrl } } : {})
				},
				{ status: 403, headers: NO_STORE }
			);
		case 'created_unopened':
			return NextResponse.json({ code: 'CREATED_NOT_OPENED' }, { status: 502, headers: NO_STORE });
		default:
			return NextResponse.json({ code: 'FAILED' }, { status: 502, headers: NO_STORE });
	}
}
