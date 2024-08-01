import { useCallback, useState } from 'react';
import { useQuery } from '../useQuery';
import { useAuthenticateUser } from './useAuthenticateUser';
import { addManualTimeRequestAPI } from '@app/services/client/api/timer/manual-time';
import { IAddManualTimeRequest, ITimeLog } from '@app/interfaces/timer/ITimerLogs';
import { TimeLogType, TimerSource } from '@app/interfaces';

export function useManualTime() {
	const { user } = useAuthenticateUser();

	const { loading: addManualTimeLoading, queryCall: queryAddManualTime } = useQuery(addManualTimeRequestAPI);
	const [timeLog, setTimeLog] = useState<ITimeLog>();

	const addManualTime = useCallback(
		(data: Omit<IAddManualTimeRequest, 'tenantId' | 'employeeId' | 'logType' | 'source'>) => {
			console.log(data);
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
