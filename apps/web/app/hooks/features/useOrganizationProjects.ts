import {
	editOrganizationProjectSettingAPI,
	editOrganizationProjectAPI,
	getOrganizationProjectAPI,
	getOrganizationProjectsAPI,
	createOrganizationProjectAPI,
	deleteOrganizationProjectAPI
} from '@app/services/client/api';
import { userState } from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';
import { organizationProjectsState } from '@/app/stores/organization-projects';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/app/helpers';
import { ICreateProjectInput } from '@/app/interfaces';

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

	const { loading: createOrganizationProjectLoading, queryCall: createOrganizationProjectQueryCall } =
		useQuery(createOrganizationProjectAPI);

	const { loading: deleteOrganizationProjectLoading, queryCall: deleteOrganizationProjectQueryCall } =
		useQuery(deleteOrganizationProjectAPI);

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

	const getOrganizationProjects = useCallback(
		async ({ queries }: { queries?: Record<string, string> } = {}) => {
			try {
				const res = await getOrganizationProjectsQueryCall({ queries });
				return res.data;
			} catch (error) {
				console.log(error);
			}
		},
		[getOrganizationProjectsQueryCall]
	);

	const createOrganizationProject = useCallback(
		async (data: Partial<ICreateProjectInput>) => {
			try {
				const organizationId = getOrganizationIdCookie();
				const tenantId = getTenantIdCookie();

				const res = await createOrganizationProjectQueryCall({ ...data, organizationId, tenantId });

				setOrganizationProjects([...organizationProjects, res.data]);

				return res.data;
			} catch (error) {
				console.error(error);
			}
		},
		[createOrganizationProjectQueryCall, organizationProjects, setOrganizationProjects]
	);

	const deleteOrganizationProject = useCallback(
		async (id: string) => {
			try {
				const res = await deleteOrganizationProjectQueryCall(id);
				return res;
			} catch (error) {
				console.error(error);
			}
		},
		[deleteOrganizationProjectQueryCall]
	);

	const loadOrganizationProjects = useCallback(async () => {
		if (!user) return; // No user? No API call.
		if (organizationProjects.length) return; // Prevent duplicate API calls.

		getOrganizationProjects().then((data) => {
			setOrganizationProjects(data?.items ?? []);
		});
	}, [user, organizationProjects, setOrganizationProjects, getOrganizationProjects]);

	useEffect(() => {
		loadOrganizationProjects();
	}, [getOrganizationProjects, loadOrganizationProjects, setOrganizationProjects]);

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
		createOrganizationProject,
		createOrganizationProjectLoading,
		deleteOrganizationProject,
		deleteOrganizationProjectLoading,
		setOrganizationProjects
	};
}
