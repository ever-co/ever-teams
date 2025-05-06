import { IUpdateTimesheetStatus, UpdateTimesheetStatus } from '@/core/types/interfaces';
import { APIService } from '../../api.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class TimeSheetService extends APIService {
	updateStatusTimesheetFrom = async (data: IUpdateTimesheetStatus) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();
		return this.put<UpdateTimesheetStatus[]>(`/timesheet/status`, { ...data, organizationId }, { tenantId });
	};
}

export const timeSheetService = new TimeSheetService(GAUZY_API_BASE_SERVER_URL.value);
