import { useQuery } from "react-query"
import { getTimerStatusRequest, syncTimeSlotRequest } from "../../requests/timer"
import { ITimerTimeslotParams } from "../../../interfaces/ITimer"

type IGetTimerStatusParams = ITimerTimeslotParams & { authToken: string }

const fetchTimerStatus = async (params: IGetTimerStatusParams) => {
	const { tenantId, organizationId, logType, authToken, employeeId } = params

	const { data } = await getTimerStatusRequest(
		{ source: "MOBILE", tenantId, organizationId },
		authToken,
	)

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

	return data
}

const useFetchTimerStatus = (IGetTimerStatusParams, isTimerRunning: boolean) =>
	useQuery(["status-timer", IGetTimerStatusParams], () => fetchTimerStatus(IGetTimerStatusParams), {
		enabled: isTimerRunning,
		refetchInterval: 5000,
		notifyOnChangeProps: ["data"], // Re-render only when data changes
		notifyOnChangePropsExclusions: ["isFetching"],
	})
export default useFetchTimerStatus
