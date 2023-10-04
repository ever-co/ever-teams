import { useQuery } from "react-query"
import { getTimerStatusRequest, syncTimeSlotRequest } from "../../requests/timer"
import { ITimerTimeslotParams, TimerSource } from "../../../interfaces/ITimer"

type IGetTimerStatusParams = ITimerTimeslotParams & { authToken: string }

const fetchTimerStatus = async (
	params: IGetTimerStatusParams,
	isTimerRunning: boolean,
	lastlogTimerSource: TimerSource | null,
) => {
	const { tenantId, organizationId, logType, authToken, employeeId } = params

	if (isTimerRunning) {
		await syncTimeSlotRequest(
			{
				tenantId,
				organizationId,
				source: lastlogTimerSource || TimerSource.MOBILE,
				employeeId,
				duration: 5,
				logType,
			},
			authToken,
		)
	}

	const { data } = await getTimerStatusRequest({ tenantId, organizationId }, authToken)

	return data
}

const useFetchTimerStatus = (
	IGetTimerStatusParams,
	isTimerRunning: boolean,
	lastlogTimerSource: TimerSource,
) =>
	useQuery(
		["status-timer", IGetTimerStatusParams],
		() => fetchTimerStatus(IGetTimerStatusParams, isTimerRunning, lastlogTimerSource),
		{
			refetchInterval: 5000,
			notifyOnChangeProps: ["data"], // Re-render only when data changes
			notifyOnChangePropsExclusions: ["isFetching"],
		},
	)
export default useFetchTimerStatus
