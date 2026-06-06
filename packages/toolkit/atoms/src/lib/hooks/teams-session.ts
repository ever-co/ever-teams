import { cookies } from 'next/headers';

// In this example the locale is read from a cookie. You could alternatively
// also read it from a database, backend service, or any other source.
const COOKIE_NAME = 'teams-session';

export async function getTeamsSession(): Promise<string | undefined> {
	return (await cookies()).get(COOKIE_NAME)?.value;
}

export async function setTeamsSession(token: string): Promise<void> {
	(await cookies()).set(COOKIE_NAME, token, { expires: new Date(Date.now() + 24 * 60 * 60 * 1000) });
}
