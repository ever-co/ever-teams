import 'server-only';
import { cookies } from 'next/headers';
import { apiConfigManager, authLogin, createCompleteAccount } from '@ever-teams/api';
import { readRuntimeEnv } from '@/lib/runtime-env';

/**
 * Connects the local account to Ever Teams on the server, inside the sign-in / sign-up action that already holds the
 * password, and hands only the resulting Teams token to the browser.
 *
 * The password never reaches browser storage: the token waits in a short-lived httpOnly cookie, scoped to the
 * hand-off route, and `TeamsAuthHandler` collects it once from `POST /api/teams/handoff` after the redirect.
 */

const HANDOFF_COOKIE = 'teams-handoff';
const HANDOFF_PATH = '/api/teams/handoff';
const HANDOFF_MAX_AGE_S = 60;

function configureTeamsApi() {
	const apiUrl = readRuntimeEnv('NEXT_PUBLIC_TEAMS_API_URL') || process.env.NEXT_PUBLIC_TEAMS_API_URL;
	apiConfigManager.setConfig({ apiUrl });
}

/**
 * Signs in to Ever Teams with the local credentials, or creates the Teams account (tenant, organization, team) when
 * there is none, and leaves the Teams token for the hand-off. A Teams failure never fails the local sign-in.
 */
export async function connectTeamsAccount({ email, password }: { email: string; password: string }): Promise<void> {
	try {
		configureTeamsApi();
		let token: string | undefined;
		const login = await authLogin({ email, password });
		if (login && 'token' in login && login.token) {
			token = login.token;
		} else {
			const setup = await createCompleteAccount({
				fullName: email.includes('@') ? email.split('@')[0] : email,
				email,
				password,
				confirmPassword: password
			});
			if ('token' in setup) {
				token = setup.token;
			} else {
				console.warn('Teams account setup failed:', setup.error || setup.message);
			}
		}
		if (!token) return;
		(await cookies()).set(HANDOFF_COOKIE, token, {
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			path: HANDOFF_PATH,
			maxAge: HANDOFF_MAX_AGE_S
		});
	} catch (error) {
		console.warn('Teams authentication failed:', error instanceof Error ? error.message : error);
	}
}

/** The Teams token left by the last sign-in, once: reading it removes it. */
export async function takeTeamsHandoff(): Promise<string | null> {
	const store = await cookies();
	const token = store.get(HANDOFF_COOKIE)?.value ?? null;
	if (token) store.delete({ name: HANDOFF_COOKIE, path: HANDOFF_PATH });
	return token;
}
