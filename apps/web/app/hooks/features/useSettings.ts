import { IUser } from '@app/interfaces';
import {
	getAuthenticatedUserDataAPI,
	updateUserAvatarAPI,
} from '@app/services/client/api';
import { userState } from '@app/stores';

import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useQuery } from '../useQuery';

export function useSettings() {
	const [user, setUser] = useRecoilState(userState);
	const { queryCall: updateAvatarQueryCall, loading: updateLoading } =
		useQuery(updateUserAvatarAPI);

	const { queryCall: refreshUserQueryCall, loading: refreshUserLoading } =
		useQuery(getAuthenticatedUserDataAPI);

	const updateAvatar = useCallback(
		(userData: Partial<IUser> & { id: string }) => {
			return updateAvatarQueryCall(userData.id, userData).then((res) => {
				refreshUserQueryCall().then((result) => {
					setUser(result.data.user);
				});
				return res;
			});
		},
		[ updateAvatarQueryCall]
	);

	return {
		updateAvatar,
		setUser,
		updateLoading,
		refreshUserLoading,
	};
}
