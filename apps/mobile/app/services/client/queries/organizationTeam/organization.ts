import { useQuery } from '@tanstack/react-query';
import { ITeamsOut } from '../../../../models/team/Team';
import { IUserOrganization } from '../../../interfaces/IOrganization';
import { IOrganizationTeamList } from '../../../interfaces/IOrganizationTeam';
import { getUserOrganizationsRequest } from '../../requests/organization';
import { getAllOrganizationTeamRequest } from '../../requests/organization-team';

interface IGetUserOrganizationParams {
	authToken: string;
	tenantId: string;
	userId: string;
}

const fetchUserOrganization = async (params: IGetUserOrganizationParams) => {
	try {
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

		if (!filteredOrganization || filteredOrganization.length === 0) {
			return { items: [], total: 0 };
		}

		const callTeams = filteredOrganization.map((item) => {
			return getAllOrganizationTeamRequest(
				{ tenantId: params.tenantId, organizationId: item.organizationId },
				params.authToken
			);
		});

		const teamResponses = await Promise.all(callTeams);

		const data: ITeamsOut = teamResponses.reduce(
			(acc, { data }) => {
				if (data && data.items) {
					acc.items.push(...data.items);
					acc.total += data.total || 0;
				}
				return acc;
			},
			{ items: [] as IOrganizationTeamList[], total: 0 }
		);

		return data;
	} catch (error) {
		console.error('Error fetching user organizations and teams:', error);
		return { items: [], total: 0 };
	}
};

const useFetchUserOrganization = (IGetUserOrganizationParams) =>
	useQuery({
		queryKey: ['teams'],
		queryFn: () => fetchUserOrganization(IGetUserOrganizationParams),
		refetchInterval: 5000,
		refetchOnMount: true,
		notifyOnChangeProps: ['data', 'isSuccess']
	});
export default useFetchUserOrganization;
