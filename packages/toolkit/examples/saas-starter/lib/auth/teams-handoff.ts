import 'server-only';
import { cookies } from 'next/headers';
import { apiConfigManager, authLogin, createCompleteAccount, finishAccountSetup } from '@ever-teams/api';
import { readRuntimeEnv } from '@/lib/runtime-env';

/**
 * Connects the local account to Ever Teams on the server, inside the sign-in / sign-up action that already holds the
 * password, and hands only the resulting Teams token to the browser.
 *
 * The password never reaches browser storage: the token waits in a short-lived httpOnly cookie, scoped to the
 * hand-off route and bound to the local user it was made for, and `TeamsAuthHandler` collects it once from
 * `POST /api/teams/handoff` after the redirect.
 */

const HANDOFF_COOKIE = 'teams-handoff';
const HANDOFF_PATH = '/api/teams/handoff';
const HANDOFF_MAX_AGE_S = 60;
/** How long a sign-in waits for Teams; after that the local sign-in goes on without a Teams token. */
const TEAMS_DEADLINE_MS = 8_000;

function configureTeamsApi() {
	const apiUrl = readRuntimeEnv('NEXT_PUBLIC_TEAMS_API_URL') || process.env.NEXT_PUBLIC_TEAMS_API_URL;
	apiConfigManager.setConfig({ apiUrl });
}

/**
 * Signs in to Ever Teams with the local credentials, or creates the Teams account (tenant, organization, team) when
 * there is none. An account whose Teams setup stopped before its tenant is finished first, never handed over half
 * set up. Never rejects: a Teams failure is logged and answers `undefined`.
 */
async function teamsToken(email: string, password: string): Promise<string | undefined> {
	try {
		configureTeamsApi();
		const login = await authLogin({ email, password });
		if (login && 'token' in login && login.token) {
			const ready = await finishAccountSetup(login, email.split('@')[0] || email);
			if ('token' in ready) return ready.token;
			console.warn('Teams account setup failed:', ready.error || ready.message);
			return undefined;
		}
		const setup = await createCompleteAccount({
			fullName: email.includes('@') ? email.split('@')[0] : email,
			email,
			password,
			confirmPassword: password
		});
		if ('token' in setup) return setup.token;
		console.warn('Teams account setup failed:', setup.error || setup.message);
	} catch (error) {
		console.warn('Teams authentication failed:', error instanceof Error ? error.message : error);
	}
	return undefined;
}

/** Removes a pending hand-off (an earlier sign-in's, perhaps another account's). */
export async function clearTeamsHandoff(): Promise<void> {
	(await cookies()).delete({ name: HANDOFF_COOKIE, path: HANDOFF_PATH });
}

/**
 * Leaves the Teams token of `email` for the hand-off, bound to the local user `userId`. A Teams failure or a Teams
 * API slower than {@link TEAMS_DEADLINE_MS} never fails or holds up the local sign-in. The SDK requests take no
 * cancellation signal, so a late answer is dropped, not cancelled: an account created late is found by the next
 * sign-in's `authLogin`.
 */
export async function connectTeamsAccount({
	userId,
	email,
	password
}: {
	userId: number;
	email: string;
	password: string;
}): Promise<void> {
	await clearTeamsHandoff();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<undefined>((resolve) => {
		timer = setTimeout(() => resolve(undefined), TEAMS_DEADLINE_MS);
	});
	try {
		const token = await Promise.race([teamsToken(email, password), deadline]);
		if (!token) return;
		(await cookies()).set(HANDOFF_COOKIE, `${userId}.${token}`, {
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			path: HANDOFF_PATH,
			maxAge: HANDOFF_MAX_AGE_S
		});
	} finally {
		clearTimeout(timer);
	}
}

/** The Teams token the last sign-in left for local user `userId`, once: reading it removes it, whoever it was for. */
export async function takeTeamsHandoff(userId: number): Promise<string | null> {
	const value = (await cookies()).get(HANDOFF_COOKIE)?.value;
	if (!value) return null;
	await clearTeamsHandoff();
	const separator = value.indexOf('.');
	if (separator < 1 || value.slice(0, separator) !== String(userId)) return null;
	return value.slice(separator + 1) || null;
}
