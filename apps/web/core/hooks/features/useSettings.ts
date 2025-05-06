import { IUser } from '@/core/types/interfaces';
import { userState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';
import { userService } from '@/core/services/client/api';

export function useSettings() {
	const [, setUser] = useAtom(userState);
	const { queryCall: updateAvatarQueryCall, loading: updateLoading } = useQuery(userService.updateUserAvatar);

	const { queryCall: refreshUserQueryCall, loading: refreshUserLoading } = useQuery(
		userService.getAuthenticatedUserData
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
