import { errorFromResponse, NextStepsByStatus } from './error-mapping';
import { EverTeamsError } from './errors';

/**
 * The claims that mark a token of the API's embed exchange or of a person's sign-in from a site (`embedCredentialId`,
 * `embedGrantId`, ever-gauzy `embed-session.ts`): such a token reaches the timer and the user only, and the API refuses every other
 * route with 403 `EMBED_SCOPE`. In a browser that refusal is never read, since the API opens CORS to an allowed site
 * on the timer's routes only: the client refuses those calls itself, without a request (#5589).
 */
const EMBED_CLAIMS = ['embedCredentialId', 'embedGrantId'];

/** The payload of a JWT as an object, or null for a token that is not one. Unverified: only its claims are read. */
function claimsOf(token: string): Record<string, unknown> | null {
	const payload = token.split('.')[1];
	if (!payload) {
		return null;
	}
	const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
	const padding = '='.repeat((4 - (base64.length % 4)) % 4);
	try {
		const claims: unknown = JSON.parse(atob(base64 + padding));
		if (claims && typeof claims === 'object') {
			return claims as Record<string, unknown>;
		}
		return null;
	} catch {
		return null;
	}
}

/** Whether a token is an embed token: one that carries an embed claim (a sign-in from a site carries both). */
export function isEmbedToken(token: string | null): boolean {
	if (!token) {
		return false;
	}
	const claims = claimsOf(token);
	if (!claims) {
		return false;
	}
	return EMBED_CLAIMS.some((claim) => {
		const value = claims[claim];
		return typeof value === 'string' && value.length > 0;
	});
}

/** The error the API's refusal of a route an embed token cannot reach becomes, with its next step. */
export function embedScopeError(nextSteps?: NextStepsByStatus): EverTeamsError {
	const head = { status: 403, statusText: 'Forbidden', headers: new Headers() };
	const body = { statusCode: 403, code: 'EMBED_SCOPE', message: 'An embed token reaches only the timer.' };
	return errorFromResponse(head, body, nextSteps);
}
