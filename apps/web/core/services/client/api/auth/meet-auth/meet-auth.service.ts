import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

import { APIService, getFallbackAPI } from '@/core/services/client/api.service';
import { IMeetAuthRequest } from '@/core/types/interfaces/auth/auth';

class MeetAuthService extends APIService {
	getMeetJwtAuthToken = async (params?: IMeetAuthRequest) => {
		const api = await getFallbackAPI();
		return api.get<{ token: string }>('/auth/meet/jwt', {
			params
		});
	};
}

export const meetAuthService = new MeetAuthService(GAUZY_API_BASE_SERVER_URL.value);
