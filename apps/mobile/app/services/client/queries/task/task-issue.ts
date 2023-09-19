import { useQuery } from "react-query"
import { getIssueTypesListRequest } from "../../requests/issue-type"

interface IGetTaskIssuesParams {
	authToken: string
	tenantId: string
	organizationId: string
	activeTeamId: string
}
const fetchAllIssues = async (params: IGetTaskIssuesParams) => {
	const { organizationId, tenantId, activeTeamId, authToken } = params
	const { data } = await getIssueTypesListRequest(
		{
			tenantId,
			organizationId,
			activeTeamId,
		},
		authToken,
	)
	return data
}

const useFetchAllIssues = (IGetTaskIssuesParams) =>
	useQuery(["issues", IGetTaskIssuesParams], () => fetchAllIssues(IGetTaskIssuesParams), {
		refetchInterval: 5000,
	})
export default useFetchAllIssues
