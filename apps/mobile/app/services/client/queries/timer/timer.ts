import { useQuery } from "react-query"
import { getTimerStatusRequest, syncTimeSlotRequest } from "../../requests/timer"
import { ITimerTimeslotParams } from "../../../interfaces/ITimer"

type IGetTimerStatusParams = ITimerTimeslotParams & { authToken: string }

const fetchTimerStatus = async (params: IGetTimerStatusParams, isTimerRunning: boolean) => {
	const { tenantId, organizationId, logType, authToken, employeeId } = params

	if (isTimerRunning) {
		await syncTimeSlotRequest(
			{
				tenantId,
				organizationId,
				source: "MOBILE",
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

const useFetchTimerStatus = (IGetTimerStatusParams, isTimerRunning: boolean) =>
	useQuery(
		["status-timer", IGetTimerStatusParams],
		() => fetchTimerStatus(IGetTimerStatusParams, isTimerRunning),
		{
			refetchInterval: 5000,
			notifyOnChangeProps: ["data"], // Re-render only when data changes
			notifyOnChangePropsExclusions: ["isFetching"],
		},
	)
export default useFetchTimerStatus
