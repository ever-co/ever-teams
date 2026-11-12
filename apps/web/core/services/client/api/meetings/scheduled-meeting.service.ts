import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import type { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import type { MeetingAppointment, MeetingAppointmentInput, MeetingAppointmentUpdate } from '@/core/lib/utils/meetings';

/**
 * Scheduled meetings are Ever Gauzy employee appointments whose location is the meeting link: Gauzy has no meeting
 * entity, and an appointment already holds a title, a description, a place and a time. Members create, list, update
 * and delete their own (EMPLOYEE_AVAILABILITY_* permissions, granted to the employee role by default), and Gauzy lists
 * a member's own appointments only.
 */
class ScheduledMeetingService extends APIService {
	getScheduledMeetings = async (employeeId: string): Promise<MeetingAppointment[]> => {
		const findInput = { employeeId, organizationId: this.organizationId };
		const query = qs.stringify({ data: JSON.stringify({ findInput }) });
		const response = await this.get<PaginationResponse<MeetingAppointment>>(`/employee-appointment?${query}`);
		return response.data?.items ?? [];
	};

	scheduleMeeting = async (input: MeetingAppointmentInput): Promise<MeetingAppointment> => {
		// `post` adds the tenant and the organization to the body
		const response = await this.post<MeetingAppointment>('/employee-appointment', { ...input });
		return response.data;
	};

	rescheduleMeeting = async (appointmentId: string, input: MeetingAppointmentUpdate): Promise<void> => {
		// `put` adds the tenant and the organization to the body; Gauzy answers 202 with the appointment
		await this.put(`/employee-appointment/${appointmentId}`, { ...input });
	};

	cancelScheduledMeeting = async (appointmentId: string): Promise<void> => {
		await this.delete(`/employee-appointment/${appointmentId}`);
	};
}

export const scheduledMeetingService = new ScheduledMeetingService(GAUZY_API_BASE_SERVER_URL.value);
