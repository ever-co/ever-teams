import { API_BASE_URL } from '@/core/constants/config/constants';
import type {
	IEverIdRegisterDataAPI,
	IEverIdSignupPrefill,
	IEverIdWorkspacesResponse
} from '@/core/types/interfaces/auth/ever-id';

/**
 * Browser calls of the Ever ID sign-in steps that continue on this app's pages (Gauzy's one-time e-mail code
 * on the passcode page, the sign-up confirmation on the sign-up page). They go to this app's own routes
 * (/api/auth/ever-id/*, /api/auth/register), which read the step's one-time key from the sealed cookie the sign-in
 * set and talk to the Gauzy API on the server. They answer `{ status, data }` and never throw for an HTTP error,
 * so every page decides what each status means; a connection failure or the deadline rejects.
 */

/** The same deadline as the app's other API calls. */
const REQUEST_TIMEOUT_MS = 60_000;

interface EverIdCallResult<T> {
	status: number;
	data: T;
}

async function postJson<T>(path: string, body: unknown): Promise<EverIdCallResult<T>> {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		credentials: 'same-origin',
		cache: 'no-store',
		body: JSON.stringify(body),
		// Browsers without AbortSignal.timeout (older Safari) keep the browser's own deadline.
		signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(REQUEST_TIMEOUT_MS) : undefined
	});
	// A body cut off by the deadline is a failure, never an empty success.
	const data = (await response.json().catch((error: unknown) => {
		const name = (error as { name?: string } | null)?.name;
		if (name === 'TimeoutError' || name === 'AbortError') throw error;
		return {};
	})) as T;
	return { status: response.status, data };
}

export const everIdService = {
	/** Gauzy's one-time e-mail code for the link of the current Ever ID sign-in; 200 answers the workspaces. */
	confirmLink: (code: string) =>
		postJson<IEverIdWorkspacesResponse & { reason?: string }>('/auth/ever-id/confirm', { code }),

	/** The verified name and e-mail address, and the documents to accept, for the current Ever ID sign-up. */
	signupPrefill: (locale?: string) =>
		postJson<IEverIdSignupPrefill & { reason?: string }>('/auth/ever-id/signup-handoff', { locale }),

	/** The confirmed sign-up: the usual register route, with the step marker and the confirmation. */
	register: (data: IEverIdRegisterDataAPI) =>
		postJson<{ errors?: Record<string, string>; checkoutUrl?: string }>('/auth/register', data)
};
