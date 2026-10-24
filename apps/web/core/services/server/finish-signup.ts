import type { NextResponse } from 'next/server';
import { requestCookies } from './request-cookies';
import { provisionEverIdWorkspace } from './ever-id/provision';

/**
 * The second half of an e-mail sign-up. Gauzy keeps a self-registered account inactive until the link in its
 * verification e-mail is opened (owner decision 4, ever-co/ever-gauzy#11341), so the register route can no longer sign
 * in and create the workspace at once. It answers "check your e-mail" and keeps the team name in this cookie; the
 * first sign-in after the confirmation finds an account without a workspace and sets it up here, with the steps the
 * Ever ID sign-up already uses (tenant, organization, employee, team, session cookies).
 */
export const SIGNUP_TEAM_COOKIE = 'ever-teams-signup-team';

const SIGNUP_TEAM_MAX_AGE_S = 7 * 24 * 60 * 60;

/** Keeps the team name the sign-up form asked for until the account is confirmed and signs in. */
export function setSignupTeamCookie(response: NextResponse, team: string, secure: boolean): void {
	const name = team.trim().slice(0, 100);
	if (name.length < 2) return;
	response.cookies.set(SIGNUP_TEAM_COOKIE, name, {
		httpOnly: true,
		sameSite: 'lax',
		secure,
		path: '/',
		maxAge: SIGNUP_TEAM_MAX_AGE_S
	});
}

/** The team name kept at sign-up, if any. */
export function readSignupTeam(req: Request): string | undefined {
	const name = requestCookies(req).get(SIGNUP_TEAM_COOKIE)?.trim();
	return name && name.length >= 2 ? name.slice(0, 100) : undefined;
}

/**
 * Sets up the workspace of a confirmed account that has none, from a workspace token of Gauzy's sign-in (e-mail code
 * or password), and signs it in (cookies on `response`). See provisionEverIdWorkspace for the results.
 */
export async function finishSignupWorkspace(input: {
	req: Request;
	response: NextResponse;
	email: string;
	workspaceToken: string;
	userId?: string;
	timezone?: string;
}) {
	const result = await provisionEverIdWorkspace({
		req: input.req,
		response: input.response,
		email: input.email,
		workspaceToken: input.workspaceToken,
		fallbackUserId: input.userId,
		team: readSignupTeam(input.req),
		timezone: input.timezone
	});
	if (result === 'ok') input.response.cookies.delete(SIGNUP_TEAM_COOKIE);
	return result;
}
