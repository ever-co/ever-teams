import { ITimerStatus } from '@app/interfaces';
import { get } from '../../axios';

export async function getTaskStatusList(
	tenantId: string,
	organizationId: string,
	employeeId: string,
	organizationTeamId: string | null
) {
	const params = {
		tenantId: tenantId,
		organizationId: organizationId,
		employeeId: employeeId,
		organizationTeamId:organizationTeamId
	};
	const query = new URLSearchParams(params);

	const endpoint = 
	GAUZY_API_BASE_SERVER_URL.value ? 
		`/timesheet/timer/status?${query.toString()}` : 
		`/timer/status?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}&employeeId=${employeeId}`;

	return get<ITimerStatus>(endpoint, { tenantId });
}

// todayStart, todayEnd;
