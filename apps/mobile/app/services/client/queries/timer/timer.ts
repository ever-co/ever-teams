import { useQuery } from "react-query"
import { getTimerStatusRequest } from "../../requests/timer"

interface IGetTimerStatusParams {
	authToken: string
	tenantId: string
	organizationId: string
}
const fetchTimerStatus = async (params: IGetTimerStatusParams) => {
	const { tenantId, organizationId, authToken } = params
	const { data } = await getTimerStatusRequest(
		{ source: "BROWSER", tenantId, organizationId },
		authToken,
	)
	return data
}

const useFetchTimerStatus = (IGetTimerStatusParams) =>
	useQuery(["tasks", IGetTimerStatusParams], () => fetchTimerStatus(IGetTimerStatusParams), {
		refetchInterval: 5000,
	})
export default useFetchTimerStatus
