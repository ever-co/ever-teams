import { useCallback, useState } from 'react';
import { useQuery } from '../common/use-query';
import { ITimeLog } from '@/core/types/interfaces/time-log/ITimeLog';
import { TimeLogType, TimerSource } from '@/core/types/interfaces/to-review';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { useAuthenticateUser } from '../auth';
import { IAddManualTimeRequest } from '@/core/types/interfaces/time-slot/ITimeSlot';

export function useManualTime() {
	const { user } = useAuthenticateUser();

	const { loading: addManualTimeLoading, queryCall: queryAddManualTime } = useQuery(timeLogService.addManualTime);
	const [timeLog, setTimeLog] = useState<ITimeLog>();

	const addManualTime = useCallback(
		(data: Omit<IAddManualTimeRequest, 'tenantId' | 'employeeId' | 'logType' | 'source'>) => {
			queryAddManualTime({
				tenantId: user?.tenantId ?? '',
				employeeId: user?.employee.id ?? '',
				logType: TimeLogType.MANUAL,
				source: TimerSource.BROWSER,
				...data
			})
				.then((response) => {
					setTimeLog(response.data);
				})
				.catch((error) => {
					console.log(error);
				});
		},
		[queryAddManualTime, user?.employee.id, user?.tenantId]
	);

	return {
		addManualTimeLoading,
		addManualTime,
		timeLog
	};
}
