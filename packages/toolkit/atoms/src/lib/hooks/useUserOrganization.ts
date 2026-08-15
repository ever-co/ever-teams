import { ApiCall } from '@ever-teams/api';
import { IHookResponse, IServerError, IUser, IUserOrganization, PaginationResponse } from '@ever-teams/toolkit-types';
import { toast } from '@ever-teams/toolkit-ui';
import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { userOrganizationsAtom } from '../teams-jotai/atoms/teams-atoms';
import QueryString from 'qs';

const useUserOrganization = (
	user: IUser | null,
	token: string
): IHookResponse<PaginationResponse<IUserOrganization> | null> => {
	const [userOrganizations, setUserOrganizations] = useAtom(userOrganizationsAtom);

	const getOrganisation = async (user: IUser | null, token: string) => {
		try {
			if (!user) throw new Error('User is not authenticated !');

			const { tenantId, id: userId } = user;

			const query = QueryString.stringify({
				relations: ['organization', 'organization.contact'],
				where: {
					userId,
					tenantId
				},
				includeEmployee: true
			});

			const response = await ApiCall<PaginationResponse<IUserOrganization>>({
				path: `/user-organization?${query}`,
				method: 'GET',
				bearer_token: token,
				tenantId
			});

			if ('data' in response) {
				return response.data;
			}

			if ('error' in response || 'message' in response) {
				return response;
			}

			return { error: 'Unexpected response format' } as IServerError;
		} catch (error) {
			return { error: (error as Error).message } as IServerError;
		}
	};

	useEffect(() => {
		if (user && token) {
			(async () => {
				setUserOrganizations((prev) => ({ ...prev, loading: true }));

				const userOrganization = await getOrganisation(user, token);

				if ('message' in userOrganization || 'error' in userOrganization) {
					const errorMessage =
						'message' in userOrganization
							? Array.isArray(userOrganization.message)
								? userOrganization.message.join(', ')
								: userOrganization.message
							: String(userOrganization.error);

					toast({
						variant: 'destructive',
						description: errorMessage
					});
					setUserOrganizations((prev) => ({ ...prev, loading: false }));

					return;
				}

				// Filter organizations where the user is an employee
				// if (user.employee) {
				// 	const filteredOrganizations = userOrganization.items.filter((org) => {
				// 		return org.organization?.employees?.some((employee) => employee?.id === user.employee?.id);
				// 	});

				// 	if (filteredOrganizations.length > 0) {
				// 		setUserOrganizations({
				// 			data: { items: filteredOrganizations, total: filteredOrganizations.length },
				// 			loading: false
				// 		});
				// 	} else {
				// 		setUserOrganizations({
				// 			data: { items: [], total: 0 },
				// 			loading: false
				// 		});
				// 	}

				// 	return;
				// }

				setUserOrganizations({ data: userOrganization, loading: false });
			})();
			// }
		}
	}, [user, token]);

	return userOrganizations;
};

export { useUserOrganization };
