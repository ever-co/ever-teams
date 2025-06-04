import { APIService } from '../../api.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ITimesheet, IUpdateTimesheetStatus } from '@/core/types/interfaces/timesheet/timesheet';

class TimeSheetService extends APIService {
	updateStatusTimesheetFrom = async (data: IUpdateTimesheetStatus) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();
		return this.put<ITimesheet[]>(`/timesheet/status`, { ...data, organizationId }, { tenantId });
	};
}

export const timeSheetService = new TimeSheetService(GAUZY_API_BASE_SERVER_URL.value);
