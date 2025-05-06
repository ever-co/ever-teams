import { IMeetAuthRequest } from '@/core/types/interfaces';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

import api from '../../../axios';
import { APIService } from '@/core/services/client/api.service';

class MeetAuthService extends APIService {
	getMeetJwtAuthToken = async (params?: IMeetAuthRequest) => {
		return api.get<{ token: string }>('/auth/meet/jwt', {
			params
		});
	};
}

export const meetAuthService = new MeetAuthService(GAUZY_API_BASE_SERVER_URL.value);
