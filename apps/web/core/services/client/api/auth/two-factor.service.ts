import { APP_NAME, GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { getOrganizationIdCookie } from '@/core/lib/helpers/cookies';
import type {
	ITwoFactorConfirmation,
	ITwoFactorEnrollment,
	ITwoFactorProof,
	ITwoFactorRecoveryCodes,
	ITwoFactorStatus
} from '@/core/types/interfaces/auth/two-factor';
import { APIService } from '../../api.service';

/**
 * The signed-in person's own two-factor authentication (Gauzy `/api/auth/two-factor/*`; in proxy mode this app's
 * `/api/auth/two-factor/*` twins). Off for every account until its owner turns it on.
 *
 * The bodies carry no `tenantId` / `organizationId` (Gauzy's routes take neither). A wrong code answers 401: the
 * calls that take one expect it, so it is shown as a wrong code and does not sign anyone out.
 */
class TwoFactorService extends APIService {
	/** The state of the signed-in person; the active organization says whether it asks its members for it. */
	getStatus = async (): Promise<ITwoFactorStatus> => {
		const organizationId = getOrganizationIdCookie();
		const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
		const { data } = await this.get<ITwoFactorStatus>(`/auth/two-factor${query}`);
		return data;
	};

	/** Starts the setup: the secret for the authenticator app, shown once. */
	enroll = async (): Promise<ITwoFactorEnrollment> => {
		const { data } = await this.post<ITwoFactorEnrollment>(
			'/auth/two-factor/enroll',
			{ issuer: APP_NAME },
			{ secretResponse: true },
			false
		);
		return data;
	};

	/** Turns it on with the first code of the app: answers the recovery codes, shown once. */
	confirm = async (code: string): Promise<ITwoFactorConfirmation> => {
		const { data } = await this.post<ITwoFactorConfirmation>(
			'/auth/two-factor/confirm',
			{ code },
			{ secretResponse: true, expectedUnauthorized: true },
			false
		);
		return data;
	};

	/** Turns it off, proven with a current code or a recovery code. */
	disable = async (proof: ITwoFactorProof): Promise<ITwoFactorStatus> => {
		const { data } = await this.post<ITwoFactorStatus>(
			'/auth/two-factor/disable',
			{ ...proof },
			{ expectedUnauthorized: true },
			false
		);
		return data;
	};

	/** Replaces the recovery codes (the old ones stop working), proven like `disable`. */
	regenerateRecoveryCodes = async (proof: ITwoFactorProof): Promise<ITwoFactorRecoveryCodes> => {
		const { data } = await this.post<ITwoFactorRecoveryCodes>(
			'/auth/two-factor/recovery-codes',
			{ ...proof },
			{ secretResponse: true, expectedUnauthorized: true },
			false
		);
		return data;
	};

	/** An administrator turns a member's second factor off, for a member who lost their app and their codes. */
	resetMember = async (userId: string): Promise<{ reset: boolean }> => {
		const { data } = await this.delete<{ reset: boolean }>(`/auth/two-factor/users/${encodeURIComponent(userId)}`);
		return data;
	};
}

export const twoFactorService = new TwoFactorService(GAUZY_API_BASE_SERVER_URL.value);
