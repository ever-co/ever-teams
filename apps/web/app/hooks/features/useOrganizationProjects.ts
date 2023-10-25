import { editOrganizationProjectSettingAPI, editOrganizationProjectAPI } from '@app/services/client/api';
import { userState } from '@app/stores';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useQuery } from '../useQuery';

export function useOrganizationProjects() {
	const [user] = useRecoilState(userState);

	const { loading: editOrganizationProjectLoading, queryCall: editOrganizationProjectQueryCall } =
		useQuery(editOrganizationProjectAPI);

	const { loading: editOrganizationProjectSettingLoading, queryCall: editOrganizationProjectSettingQueryCall } =
		useQuery(editOrganizationProjectSettingAPI);

	const editOrganizationProjectSetting = useCallback(
		(id: string, data: any) => {
			if (user?.tenantId) {
				return editOrganizationProjectSettingQueryCall(id, data, user?.tenantId || '').then((res) => {
					return res;
				});
			}
		},
		[user, editOrganizationProjectSettingQueryCall]
	);

	const editOrganizationProject = useCallback(
		(id: string, data: any) => {
			if (user?.tenantId) {
				return editOrganizationProjectQueryCall(id, data, user?.tenantId || '').then((res) => {
					return res;
				});
			}
		},
		[user, editOrganizationProjectQueryCall]
	);

	return {
		editOrganizationProjectSetting,
		editOrganizationProjectSettingLoading,
		editOrganizationProject,
		editOrganizationProjectLoading
	};
}
