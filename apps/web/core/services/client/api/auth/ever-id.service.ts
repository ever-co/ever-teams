import { API_BASE_URL } from '@/core/constants/config/constants';
import type {
	IEverIdRegisterDataAPI,
	IEverIdSignupPrefill,
	IEverIdWorkspacesResponse
} from '@/core/types/interfaces/auth/ever-id';

/**
 * Browser calls of the Ever ID sign-in steps that continue on this app's pages (Gauzy's one-time e-mail code
 * on the passcode page, the sign-up confirmation on the sign-up page). They go to this app's own routes
 * (/api/auth/ever-id/*, /api/auth/register), which talk to the Gauzy API on the server. They answer
 * `{ status, data }` and never throw for an HTTP error, so every page decides what each status means.
 */

export interface EverIdCallResult<T> {
	status: number;
	data: T;
}

async function postJson<T>(path: string, body: unknown): Promise<EverIdCallResult<T>> {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		credentials: 'same-origin',
		cache: 'no-store',
		body: JSON.stringify(body)
	});
	const data = (await response.json().catch(() => ({}))) as T;
	return { status: response.status, data };
}

export const everIdService = {
	/** Gauzy's one-time e-mail code for a link of the sign-in identified by `handoff`; 200 answers the workspaces. */
	confirmLink: (handoff: string, code: string) =>
		postJson<IEverIdWorkspacesResponse & { reason?: string }>('/auth/ever-id/confirm', { handoff, code }),

	/** The verified name and e-mail address, and the documents to accept, for an Ever ID sign-up. */
	signupPrefill: (handoff: string, locale?: string) =>
		postJson<IEverIdSignupPrefill & { reason?: string }>('/auth/ever-id/signup-handoff', { handoff, locale }),

	/** The confirmed sign-up: the usual register route, with the hand-off key and the confirmation. */
	register: (data: IEverIdRegisterDataAPI) =>
		postJson<{ errors?: Record<string, string>; checkoutUrl?: string }>('/auth/register', data)
};
