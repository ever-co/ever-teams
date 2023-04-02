import { useQuery } from "react-query"
import { getTeamTasksRequest } from "../../requests/tasks"

interface IGetAllTasksParams {
	authToken: string
	tenantId: string
	organizationId: string
}
const fetchAllTasks = async (params: IGetAllTasksParams) => {
	const { data } = await getTeamTasksRequest({
		bearer_token: params.authToken,
		tenantId: params.tenantId,
		organizationId: params.organizationId,
	})
	return data
}

const useFetchAllTasks = (IGetAllTasksParams) =>
	useQuery(["tasks", IGetAllTasksParams], () => fetchAllTasks(IGetAllTasksParams), {
		refetchInterval: 3000,
	})
export default useFetchAllTasks
