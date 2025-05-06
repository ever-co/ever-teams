import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../api.service';

class TimeSlotService extends APIService {
	deleteTimeSlots = async ({
		tenantId,
		organizationId,
		ids
	}: {
		tenantId: string;
		organizationId: string;
		ids: string[];
	}) => {
		// Not implemented in the backend
	};
}

export const timeSlotService = new TimeSlotService(GAUZY_API_BASE_SERVER_URL.value);
