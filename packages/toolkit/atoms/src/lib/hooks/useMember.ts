import { IHookResponse, IMember, PaginationResponse } from '@ever-teams/toolkit-types';
import { getWeekStartAndEnd, toast } from '@ever-teams/toolkit-ui';
import { useEffect, useState } from 'react';
import { getMembers } from '@ever-teams/api';
import { useTeamsContext } from '@lib/context/teams-context';

const useMember = (): IHookResponse<PaginationResponse<IMember> | null> => {
	const [members, setMembers] = useState<IHookResponse<PaginationResponse<IMember> | null>>({
		data: null,
		loading: false
	});

	const { userPermissions, authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();

	const fetchMembers = async () => {
		if (user && organizationId && token) {
			setMembers((prev) => ({ ...prev, loading: true }));

			const userMembers = await getMembers(user, token, organizationId, getWeekStartAndEnd());

			if ('message' in userMembers || 'error' in userMembers) {
				const errorMessage =
					'message' in userMembers
						? Array.isArray(userMembers.message)
							? userMembers.message.join(', ')
							: userMembers.message
						: String(userMembers.error);

				toast({
					variant: 'destructive',
					description: errorMessage
				});
				setMembers((prev) => ({ ...prev, loading: false }));

				return;
			}

			setMembers((prev) => ({ ...prev, data: userMembers, loading: false }));
		} else {
			setMembers({ data: { items: [], total: 0 }, loading: false });
		}
	};

	useEffect(() => {
		fetchMembers();
	}, [user, userPermissions, organizationId, token]);

	return members;
};

export { useMember };
