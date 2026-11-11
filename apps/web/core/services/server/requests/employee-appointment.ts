import { DeleteResponse, PaginationResponse } from '@/core/types/interfaces/common/data-response';
import type { MeetingAppointment } from '@/core/lib/utils/meetings';
import { serverFetch } from '../fetch';

/** A member's own appointments (`GET /employee-appointment`), the query as the client sent it. */
export function getEmployeeAppointmentsRequest({
	query,
	bearer_token,
	tenantId
}: {
	query: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<PaginationResponse<MeetingAppointment>>({
		path: query ? `/employee-appointment?${query}` : '/employee-appointment',
		method: 'GET',
		bearer_token,
		tenantId
	});
}

/** A scheduled meeting is an appointment whose location is the meeting link (`POST /employee-appointment`). */
export function createEmployeeAppointmentRequest({
	data,
	bearer_token,
	tenantId
}: {
	data: Record<string, unknown>;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<MeetingAppointment>({
		path: '/employee-appointment',
		method: 'POST',
		body: data,
		bearer_token,
		tenantId
	});
}

export function deleteEmployeeAppointmentRequest({
	id,
	bearer_token,
	tenantId
}: {
	id: string;
	bearer_token: string;
	tenantId: string;
}) {
	return serverFetch<DeleteResponse>({
		path: `/employee-appointment/${encodeURIComponent(id)}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}
