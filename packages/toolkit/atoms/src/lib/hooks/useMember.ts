import { IHookResponse, IMember, PaginationResponse } from '@ever-teams/toolkit-types';
import { getWeekStartAndEnd, toast } from '@ever-teams/toolkit-ui';
import { useEffect, useState } from 'react';
import { getMembers } from '@ever-teams/api';
import { useTeamsContext } from '@lib/context/teams-context';
import { useKitOptions } from '@components/teams-provider/kit-options';

const useMember = (): IHookResponse<PaginationResponse<IMember> | null> => {
	const [members, setMembers] = useState<IHookResponse<PaginationResponse<IMember> | null>>({
		data: null,
		loading: false
	});

	const { userPermissions, authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();
	const { api } = useKitOptions();

	// isCurrent turns false once the effect has moved past this read (another person, organization or address, or the
	// widget gone): its answer then shows nothing, not even its error, as the toasts are the page's.
	const fetchMembers = async (isCurrent: () => boolean) => {
		if (user && organizationId && token) {
			setMembers((prev) => ({ ...prev, loading: true }));

			const userMembers = await getMembers(user, token, organizationId, getWeekStartAndEnd(), api);
			if (!isCurrent()) {
				return;
			}

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
		let current = true;
		fetchMembers(() => current);
		return () => {
			current = false;
			// The next read, if any, sets it again
			setMembers((prev) => (prev.loading ? { ...prev, loading: false } : prev));
		};
	}, [user, userPermissions, organizationId, token, api]);

	return members;
};

export { useMember };
