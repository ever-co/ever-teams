import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';
import {
	validateApiResponse,
	ZodValidationError,
	TDeleteTimeSlotsRequest,
	TDeleteTimeSlotsResponse,
	deleteTimeSlotsResponseSchema
} from '@/core/types/schemas';

class TimeSlotService extends APIService {
	/**
	 * Delete time slots with validation
	 *
	 * @param params - Delete time slots parameters
	 * @returns Promise<TDeleteTimeSlotsResponse> - Validated deletion response
	 * @throws ValidationError if response data doesn't match schema
	 */
	deleteTimeSlots = async (params: TDeleteTimeSlotsRequest): Promise<TDeleteTimeSlotsResponse> => {
		try {
			// Build query parameters according to API documentation
			const queryParams = {
				tenantId: params.tenantId,
				organizationId: params.organizationId,
				ids: params.ids,
				forceDelete: params.forceDelete ?? false
			};

			const query = qs.stringify(queryParams, { arrayFormat: 'repeat' });
			const endpoint = `/timesheet/time-slot?${query}`;

			const response = await this.delete<TDeleteTimeSlotsResponse>(endpoint);

			// Validate the response data using Zod schema
			return validateApiResponse(deleteTimeSlotsResponseSchema, response.data, 'deleteTimeSlots API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Time slots deletion validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'TimeSlotService'
				);
			}
			throw error;
		}
	};
}

export const timeSlotService = new TimeSlotService(GAUZY_API_BASE_SERVER_URL.value);
