import { APIService } from '../../api.service';
import { ApiErrorService } from '../../api-error.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type { APIConfig } from '../../axios';
import type {
	IAccountDeletionConfirmResponse,
	IAccountDeletionRequestBody,
	IAccountDeletionVerifyResponse
} from '@/core/lib/auth/account-deletion';

/**
 * These calls are public and must not carry anything from a session that may be open in the same browser: no
 * Authorization header (`pinnedAuthorization` without a header) and no tenant / organization ids added to the body.
 */
const PUBLIC_REQUEST: APIConfig = { pinnedAuthorization: true };

/**
 * Account deletion by e-mail link (Gauzy `POST /api/account-deletion/{request,verify,confirm}`).
 *
 * Direct mode (NEXT_PUBLIC_GAUZY_API_SERVER_URL set) calls the Gauzy API; proxy mode calls this app's
 * `/api/account-deletion/*` routes, which forward to GAUZY_API_SERVER_URL — the same two modes as the other auth calls.
 */
class AccountDeletionService extends APIService {
	/** Always answers 202 `{ status: 'accepted' }`, whether or not an account exists for the address. */
	requestLink = async (body: IAccountDeletionRequestBody) => {
		return this.post<{ status: string }>('/account-deletion/request', { ...body }, PUBLIC_REQUEST, false);
	};

	/** Describes what the link would delete. Does not use the token up. 410 for an unusable link. */
	verify = async (token: string): Promise<IAccountDeletionVerifyResponse> => {
		const { data } = await this.post<IAccountDeletionVerifyResponse>(
			'/account-deletion/verify',
			{ token },
			PUBLIC_REQUEST,
			false
		);
		return data;
	};

	/**
	 * Uses the token up and deletes what the preview with `planHash` showed. 410 for an unusable link; 409 (nothing
	 * deleted, token kept) when the accounts changed since that preview.
	 */
	confirm = async (token: string, planHash?: string): Promise<IAccountDeletionConfirmResponse> => {
		const { data } = await this.post<IAccountDeletionConfirmResponse>(
			'/account-deletion/confirm',
			{ token, confirm: true, ...(planHash ? { planHash } : {}) },
			PUBLIC_REQUEST,
			false
		);
		return data;
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
	 * `POST /account-deletion/me` `{ confirm: true, planHash }` (the preview's); Gauzy checks ACCESS_DELETE_ACCOUNT, and
	 * answers 409 without deleting when the outcome changed since that preview.
	 */
	deleteMe = async (planHash?: string): Promise<IAccountDeletionConfirmResponse> => {
		const { data } = await this.post<IAccountDeletionConfirmResponse>(
			'/account-deletion/me',
			{ confirm: true, ...(planHash ? { planHash } : {}) },
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
