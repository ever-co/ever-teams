import { useQuery } from '@tanstack/react-query';
import { getTimerStatusRequest, syncTimeSlotRequest } from '../../requests/timer';
import { ITimerTimeslotParams, TimerSource } from '../../../interfaces/ITimer';
import { NEXT_SHELL_BUILD } from '../../../../../src/navigation/next-shell-build';

type IGetTimerStatusParams = ITimerTimeslotParams & { authToken: string };

const fetchTimerStatus = async (
	params: IGetTimerStatusParams,
	isTimerRunning: boolean,
	lastlogTimerSource: TimerSource | null
) => {
	const { tenantId, organizationId, logType, authToken, employeeId } = params;

	// In builds of the new app, its heartbeat writes the running time (src/home/next-shell-heartbeat.tsx): once
	const writesTheRunningTime = isTimerRunning && !NEXT_SHELL_BUILD;
	if (writesTheRunningTime) {
		await syncTimeSlotRequest(
			{
				tenantId,
				organizationId,
				source: lastlogTimerSource || TimerSource.MOBILE,
				employeeId,
				duration: 5,
				logType
			},
			authToken
		);
	}

	const { data } = await getTimerStatusRequest({ tenantId, organizationId }, authToken);

	return data;
};

const useFetchTimerStatus = (IGetTimerStatusParams, isTimerRunning: boolean, lastlogTimerSource: TimerSource) =>
	useQuery({
		queryKey: ['status-timer'],
		queryFn: () => fetchTimerStatus(IGetTimerStatusParams, isTimerRunning, lastlogTimerSource),
		refetchInterval: 5000,
		notifyOnChangeProps: ['data'] // Re-render only when data changes
	});
export default useFetchTimerStatus;
