import { useQuery } from "react-query"
import { ITeamsOut } from "../../../../models/team/team";
import { IUserOrganization } from "../../../interfaces/IOrganization";
import { IOrganizationTeamList } from "../../../interfaces/IOrganizationTeam";
import { getUserOrganizationsRequest } from "../../requests/organization";
import { getAllOrganizationTeamRequest } from "../../requests/organization-team";

interface IGetUserOrganizationParams {
    authToken: string;
    tenantId: string;
    userId: string;
}
const fetchUserOrganization = async (params: IGetUserOrganizationParams) => {
    const { data: organizations } = await getUserOrganizationsRequest(
        { tenantId: params.tenantId, userId: params.userId },
        params.authToken
    );
    const organizationsItems = organizations?.items;

    const filteredOrganization = organizationsItems?.reduce((acc, org) => {
        if (!acc.find((o) => o.organizationId === org.organizationId)) {
            acc.push(org);
        }
        return acc;
    }, [] as IUserOrganization[]);


    const call_teams = filteredOrganization?.map((item) => {
        return getAllOrganizationTeamRequest(
            { tenantId: params.tenantId, organizationId: item.organizationId },
            params.authToken
        );
    });

    const data: ITeamsOut = await Promise.all(call_teams).then((tms) => {
        return tms.reduce(
            (acc, { data }) => {
                acc.items.push(...data.items);
                acc.total += data.total;
                return acc;
            },
            { items: [] as IOrganizationTeamList[], total: 0 }
        );
    });

    return data;
};

const useFetchUserOrganization = (IGetUserOrganizationParams) => useQuery(['teams', IGetUserOrganizationParams], () => fetchUserOrganization(IGetUserOrganizationParams));
export default useFetchUserOrganization;