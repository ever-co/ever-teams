import axios from 'axios';
import { APIService } from '../../api.service';
import { ApiErrorService } from '../../api-error.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { appEmailBranding } from '@/core/lib/helpers/app-email-branding';
import type {
	IAccountDeletionConfirmResponse,
	IAccountDeletionRequestBody,
	IAccountDeletionVerifyResponse
} from '@/core/lib/auth/account-deletion';

/**
 * The base URL of the public calls: the Gauzy API in direct mode (NEXT_PUBLIC_GAUZY_API_SERVER_URL set, read at
 * runtime), else this app's `/api` proxy routes.
 */
function publicBaseUrl(): string {
	const base = GAUZY_API_BASE_SERVER_URL.value;
	return base ? `${base}/api` : '/api';
}

/**
 * POST to a public account deletion route with a plain axios instance, NOT the app's APIService instances.
 *
 * Those add the signed-in session to every request (bearer token, `tenant-id` header, tenant / organization ids in the
 * body) and, in development, log the request body, which here holds the deletion token (and the local log system can
 * forward those logs to `/api/log`). These calls are public and must carry nothing but their body. Errors become
 * ApiErrorService, so callers read the status as for any other call.
 */
async function publicPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
	try {
		const { data } = await axios.post<T>(`${publicBaseUrl()}${path}`, body, {
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			withCredentials: false,
			timeout: 60_000
		});
		return data;
	} catch (error) {
		throw ApiErrorService.fromAxiosError(error);
	}
}

/**
 * Account deletion (Gauzy `/api/account-deletion/*`).
 *
 * The e-mail link calls (`request`, `verify`, `confirm`) are public: see publicPost. Direct mode calls the Gauzy API;
 * proxy mode calls this app's `/api/account-deletion/*` routes, which forward to GAUZY_API_SERVER_URL — the same two
 * modes as the other auth calls. The signed-in calls (`/me`) go through APIService, with the session.
 */
class AccountDeletionService extends APIService {
	/** Always answers 202 `{ status: 'accepted' }`, whether or not an account exists for the address. */
	requestLink = async (body: IAccountDeletionRequestBody) => {
		return publicPost<{ status: string }>('/account-deletion/request', { ...body });
	};

	/** Describes what the link would delete. Does not use the token up. 410 for an unusable link. */
	verify = async (token: string): Promise<IAccountDeletionVerifyResponse> => {
		return publicPost<IAccountDeletionVerifyResponse>('/account-deletion/verify', { token });
	};

	/**
	 * Uses the token up and deletes what the preview with `planHash` showed. 410 for an unusable link; 409 (nothing
	 * deleted, token kept) when the accounts changed since that preview.
	 */
	confirm = async (token: string, planHash?: string): Promise<IAccountDeletionConfirmResponse> => {
		return publicPost<IAccountDeletionConfirmResponse>('/account-deletion/confirm', {
			token,
			confirm: true,
			...(planHash ? { planHash } : {})
		});
	};

	/**
	 * Signed in (bearer + tenant): what deleting the CURRENT account would do, in the `verify` shape (`accounts[0]` is
	 * the current workspace: outcome, otherMembers, soleAdmin). `GET /account-deletion/me`.
	 */
	previewMe = async (): Promise<IAccountDeletionVerifyResponse> => {
		const { data } = await this.get<IAccountDeletionVerifyResponse>('/account-deletion/me');
		return data;
	};

	/**
	 * Signed in: deletes the CURRENT account with the e-mail link's semantics (the whole workspace when the user is
	 * its only member; otherwise the account and its member records, shared content kept without the name).
	 * `POST /account-deletion/me` `{ confirm: true, planHash, ...branding }` (the preview's hash, the app's e-mail
	 * branding for the completion e-mail); Gauzy checks ACCESS_DELETE_ACCOUNT, and
	 * answers 409 without deleting when the outcome changed since that preview.
	 */
	deleteMe = async (planHash?: string): Promise<IAccountDeletionConfirmResponse> => {
		const { data } = await this.post<IAccountDeletionConfirmResponse>(
			'/account-deletion/me',
			// The app's branding for the "your account was deleted" e-mail, as the e-mail link's request sends it
			{ ...appEmailBranding(), confirm: true, ...(planHash ? { planHash } : {}) },
			undefined,
			false
		);
		return data;
	};
}

/** True for the API's "this link is invalid or has expired" answer (410, the same for every kind of bad token). */
export function isAccountDeletionLinkGone(error: unknown): boolean {
	return (
		ApiErrorService.isApiError(error) && (error.hasHttpResponseStatus(410) || error.statusCode === 410)
	);
}

/** True for the API's 409: the accounts or outcomes changed since the preview; nothing was deleted. */
export function isAccountDeletionPlanChanged(error: unknown): boolean {
	return (
		ApiErrorService.isApiError(error) && (error.hasHttpResponseStatus(409) || error.statusCode === 409)
	);
}

export const accountDeletionService = new AccountDeletionService(GAUZY_API_BASE_SERVER_URL.value);
