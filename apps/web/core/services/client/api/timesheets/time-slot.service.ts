import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';
import { ZodValidationError, TDeleteTimeSlotsRequest } from '@/core/types/schemas';

class TimeSlotService extends APIService {
	deleteTimeSlots = async (params: TDeleteTimeSlotsRequest): Promise<{ success: boolean; message: string }> => {
		try {
			// Build query parameters according to API documentation
			const queryParams = {
				tenantId: params.tenantId,
				organizationId: params.organizationId,
				ids: params.ids,
				forceDelete: false // Default to false, can be made configurable later
			};

			const query = qs.stringify(queryParams, { arrayFormat: 'repeat' });
			const endpoint = `/timesheet/time-slot?${query}`;

			await this.delete(endpoint);

			return {
				success: true,
				message: `Successfully deleted ${params.ids.length} time slots`
			};
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Time slots deletion validation failed:', {
					message: error.message,
					issues: error.issues
				});
			}
			throw error;
		}
	};
}

export const timeSlotService = new TimeSlotService(GAUZY_API_BASE_SERVER_URL.value);
