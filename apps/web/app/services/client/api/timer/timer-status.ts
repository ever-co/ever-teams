import { ITimerStatus } from '@/core/types/interfaces';
import { get } from '../../axios';
import { GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import qs from 'qs';

export async function getTaskStatusList(
	tenantId: string,
	organizationId: string,
	employeeId: string,
	organizationTeamId: string | null
) {
	const params: {
		tenantId: string;
		organizationId: string;
		employeeId: string;
		organizationTeamId?: string;
	} = {
		tenantId: tenantId,
		organizationId: organizationId,
		employeeId: employeeId
	};
	if (organizationTeamId) params.organizationTeamId = organizationTeamId;
	const query = qs.stringify(params);

	const endpoint = GAUZY_API_BASE_SERVER_URL.value
		? `/timesheet/timer/status?${query}`
		: `/timer/status?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}&employeeId=${employeeId}`;

	return get<ITimerStatus>(endpoint, { tenantId });
}

// todayStart, todayEnd;
