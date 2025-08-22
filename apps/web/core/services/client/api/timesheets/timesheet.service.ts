import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { ITimesheet, IUpdateTimesheetStatus } from '@/core/types/interfaces/timesheet/timesheet';

class TimeSheetService extends APIService {
	updateStatusTimesheetFrom = async (data: IUpdateTimesheetStatus) => {
		return this.put<ITimesheet[]>(
			`/timesheet/status`,
			{ ...data, organizationId: this.organizationId },
			{ tenantId: this.tenantId }
		);
	};
}

export const timeSheetService = new TimeSheetService(GAUZY_API_BASE_SERVER_URL.value);
