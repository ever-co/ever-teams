import { ISuccessResponse } from '@/core/types/interfaces';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { getTenantIdCookie } from '@/core/lib/helpers/cookies';

class EmailVerificationService extends APIService {
	verifyUserEmailByCode = async (code: string, email: string) => {
		const tenantId = getTenantIdCookie();
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/email/verify/code' : `/auth/verify/code`;

		return this.post<ISuccessResponse>(endpoint, { code, tenantId, email });
	};

	verifyUserEmailByToken = async (email: string, token: string) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/email/verify' : `/auth/verify/token`;

		return this.post<ISuccessResponse>(endpoint, { email, token });
	};
}

export const emailVerificationService = new EmailVerificationService(GAUZY_API_BASE_SERVER_URL.value);
