import { useAtom } from 'jotai';
import { userPermissionsAtom } from '../teams-jotai/atoms/teams-atoms';
import { useEffect } from 'react';
import { toast } from '@ever-teams/toolkit-ui';
import { getMyPermissions } from '@ever-teams/api';
import { IHookResponse, IPermission, IUser } from '@ever-teams/toolkit-types';

const useUserPermission = (user: IUser | null, token: string): IHookResponse<IPermission[]> => {
	const [permissions, setPermissions] = useAtom(userPermissionsAtom);

	const fetchUserPermissions = async () => {
		if (!user || !token) return;

		setPermissions((prev) => ({ ...prev, loading: true }));

		try {
			const userPermissions = await getMyPermissions(user, token);

			if ('message' in userPermissions || 'error' in userPermissions) {
				const errorMessage =
					'message' in userPermissions
						? Array.isArray(userPermissions.message)
							? userPermissions.message.join(', ')
							: userPermissions.message
						: String(userPermissions.error);

				setPermissions((prev) => ({ ...prev, loading: false }));

				toast({
					description: errorMessage,
					variant: 'destructive'
				});
				return;
			}

			setPermissions({ data: userPermissions, loading: false });
		} catch (error) {
			setPermissions((prev) => ({ ...prev, loading: false }));
			toast({
				description: error instanceof Error ? error.message : 'An error occurred while fetching permissions',
				variant: 'destructive'
			});
		}
	};

	useEffect(() => {
		fetchUserPermissions();
	}, [user, token]);

	return permissions;
};

export { useUserPermission };
