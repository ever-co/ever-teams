import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

import { APIService, getFallbackAPI } from '@/core/services/client/api.service';
import { IMeetAuthRequest } from '@/core/types/interfaces/auth/auth';

class MeetAuthService extends APIService {
	getMeetJwtAuthToken = async (params?: IMeetAuthRequest) => {
		const api = await getFallbackAPI();
		// `room` is the Jitsi room the token opens: the requested name scoped to the caller's tenant
		return api.get<{ token: string; room: string }>('/auth/meet/jwt', {
			params
		});
	};
}

export const meetAuthService = new MeetAuthService(GAUZY_API_BASE_SERVER_URL.value);
