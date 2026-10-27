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
	request = async (body: IAccountDeletionRequestBody) => {
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

	/** Uses the token up and deletes. 410 for an unusable link. */
	confirm = async (token: string): Promise<IAccountDeletionConfirmResponse> => {
		const { data } = await this.post<IAccountDeletionConfirmResponse>(
			'/account-deletion/confirm',
			{ token, confirm: true },
			PUBLIC_REQUEST,
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

export const accountDeletionService = new AccountDeletionService(GAUZY_API_BASE_SERVER_URL.value);
