import { IUser } from '@/core/types/interfaces';
import { updateUserAvatarAPI } from '@/core/services/client/api';
import { userState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';
import { authService } from '@/core/services/client/api/auth/auth.service';

export function useSettings() {
	const [, setUser] = useAtom(userState);
	const { queryCall: updateAvatarQueryCall, loading: updateLoading } = useQuery(updateUserAvatarAPI);

	const { queryCall: refreshUserQueryCall, loading: refreshUserLoading } = useQuery(
		authService.getAuthenticatedUserDataAPI
	);

	//Call API for update user profile
	const updateAvatar = useCallback(
		(userData: Partial<IUser> & { id: string }) => {
			return updateAvatarQueryCall(userData.id, userData).then((res) => {
				refreshUserQueryCall().then((result) => {
					setUser(result.data);
				});
				return res;
			});
		},
		[refreshUserQueryCall, setUser, updateAvatarQueryCall]
	);

	return {
		updateAvatar,
		setUser,
		updateLoading,
		refreshUserLoading
	};
}
