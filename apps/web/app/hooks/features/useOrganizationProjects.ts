import {
	editOrganizationProjectSettingAPI,
	editOrganizationProjectAPI,
	getOrganizationProjectAPI,
	getOrganizationProjectsAPI
} from '@app/services/client/api';
import { userState } from '@app/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';
import { organizationProjectsState } from '@/app/stores/organization-projects';

export function useOrganizationProjects() {
	const [user] = useAtom(userState);
	const [organizationProjects, setOrganizationProjects] = useAtom(organizationProjectsState);

	const { loading: editOrganizationProjectLoading, queryCall: editOrganizationProjectQueryCall } =
		useQuery(editOrganizationProjectAPI);

	const { loading: editOrganizationProjectSettingLoading, queryCall: editOrganizationProjectSettingQueryCall } =
		useQuery(editOrganizationProjectSettingAPI);

	const { loading: getOrganizationProjectLoading, queryCall: getOrganizationProjectQueryCall } =
		useQuery(getOrganizationProjectAPI);

	const { loading: getOrganizationProjectsLoading, queryCall: getOrganizationProjectsQueryCall } =
		useQuery(getOrganizationProjectsAPI);

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

	const getOrganizationProject = useCallback(
		async (id: string) => {
			try {
				return await getOrganizationProjectQueryCall(id);
			} catch (error) {
				console.log(error);
			}
		},
		[getOrganizationProjectQueryCall]
	);

	const getOrganizationProjects = useCallback(async () => {
		try {
			const res = await getOrganizationProjectsQueryCall();

			setOrganizationProjects(res.data.items);
		} catch (error) {
			console.log(error);
		}
	}, [getOrganizationProjectsQueryCall, setOrganizationProjects]);

	return {
		editOrganizationProjectSetting,
		editOrganizationProjectSettingLoading,
		editOrganizationProject,
		editOrganizationProjectLoading,
		getOrganizationProject,
		getOrganizationProjectLoading,
		getOrganizationProjects,
		getOrganizationProjectsLoading,
		organizationProjects,
	};
}
