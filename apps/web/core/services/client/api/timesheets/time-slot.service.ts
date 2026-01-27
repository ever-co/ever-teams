import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '../../api.service';
import {
	validateApiResponse,
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
		const queryParams = {
			tenantId: this.tenantId,
			organizationId: this.organizationId,
			ids: params.ids,
			forceDelete: params.forceDelete ?? false
		};
		const query = qs.stringify(queryParams, { arrayFormat: 'indices' });
		const endpoint = `/timesheet/time-slot?${query}`;

		return this.executeWithValidation(
			() => this.delete<TDeleteTimeSlotsResponse>(endpoint),
			(data) => validateApiResponse(deleteTimeSlotsResponseSchema, data, 'deleteTimeSlots API response'),
			{ method: 'deleteTimeSlots', service: 'TimeSlotService', ids: params.ids }
		);
	};
}

export const timeSlotService = new TimeSlotService(GAUZY_API_BASE_SERVER_URL.value);
