import { IUser } from '@/core/types/interfaces/user/user';
import { userState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQueryCall } from '../common/use-query';
import { userService } from '@/core/services/client/api';

export function useSettings() {
	const [, setUser] = useAtom(userState);
	const { queryCall: updateAvatarQueryCall, loading: updateLoading } = useQueryCall(userService.updateUserAvatar);

	const { queryCall: refreshUserQueryCall, loading: refreshUserLoading } = useQueryCall(
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
