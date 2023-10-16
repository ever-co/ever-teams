import { editOrganizationProjectSettingAPI } from '@app/services/client/api';
import { userState } from '@app/stores';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useQuery } from '../useQuery';

export function useOrganizationProjects() {
	const [user] = useRecoilState(userState);

	const {
		loading: editOrganizationProjectSettingLoading,
		queryCall: editOrganizationProjectSettingQueryCall
	} = useQuery(editOrganizationProjectSettingAPI);

	const editOrganizationProjectSetting = useCallback(
		(id: string, data: any) => {
			if (user?.tenantId) {
				return editOrganizationProjectSettingQueryCall(
					id,
					data,
					user?.tenantId || ''
				).then((res) => {
					return res;
				});
			}
		},
		[user, editOrganizationProjectSettingQueryCall]
	);

	return {
		editOrganizationProjectSetting,
		editOrganizationProjectSettingLoading
	};
}
