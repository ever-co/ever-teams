import { useQuery } from "react-query"
import { getTaskStatusesRequest } from "../../requests/task-status";


interface IGetTaskStatusesParams {
    authToken: string;
    tenantId: string;
    organizationId: string;
}
const fetchAllStatuses = async (params: IGetTaskStatusesParams) => {
    const { organizationId, tenantId, authToken } = params;
    const { data } = await getTaskStatusesRequest({
        tenantId, organizationId
    }, authToken)
    return data;
};

const useFetchAllStatuses = (IGetTaskStatusesParams) => useQuery(['statuses', IGetTaskStatusesParams], () => fetchAllStatuses(IGetTaskStatusesParams));
export default useFetchAllStatuses;