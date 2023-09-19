import { useQuery } from "react-query"
import { getTaskStatusesRequest } from "../../requests/task-status"

interface IGetTaskStatusesParams {
	authToken: string
	tenantId: string
	organizationId: string
	activeTeamId: string
}
const fetchAllStatuses = async (params: IGetTaskStatusesParams) => {
	const { organizationId, tenantId, activeTeamId, authToken } = params
	const { data } = await getTaskStatusesRequest(
		{
			tenantId,
			organizationId,
			activeTeamId,
		},
		authToken,
	)
	return data
}

const useFetchAllStatuses = (IGetTaskStatusesParams) =>
	useQuery(["statuses", IGetTaskStatusesParams], () => fetchAllStatuses(IGetTaskStatusesParams), {
		refetchInterval: 1000,
	})
export default useFetchAllStatuses
