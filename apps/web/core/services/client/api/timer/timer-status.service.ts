import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ITimerStatus } from '@/core/types/interfaces';

class TimerStatusService extends APIService {
	getTaskStatusList = async (
		tenantId: string,
		organizationId: string,
		employeeId: string,
		organizationTeamId: string | null
	) => {
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

		return this.get<ITimerStatus>(endpoint, { tenantId });
	};
}

export const timerStatusService = new TimerStatusService(GAUZY_API_BASE_SERVER_URL.value);
