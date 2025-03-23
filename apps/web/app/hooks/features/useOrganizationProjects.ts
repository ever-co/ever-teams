import {
	editOrganizationProjectSettingAPI,
	editOrganizationProjectAPI,
	getOrganizationProjectAPI,
	getOrganizationProjectsAPI,
	createOrganizationProjectAPI,
	deleteOrganizationProjectAPI
} from '@app/services/client/api';
import { userState } from '@app/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';
import { organizationProjectsState } from '@/app/stores/organization-projects';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/app/helpers';
import { ICreateProjectInput, IEditProjectInput } from '@/app/interfaces';
import { useFirstLoad } from '../useFirstLoad';

export function useOrganizationProjects() {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();
	const [organizationProjects, setOrganizationProjects] = useAtom(organizationProjectsState);
	const [user] = useAtom(userState);
	const { firstLoadData: firstOrganizationProjectsLoad } = useFirstLoad();

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
			try {
				if (tenantId) {
					return editOrganizationProjectSettingQueryCall(id, data, tenantId).then((res) => {
						return res;
					});
				} else {
					throw new Error('Required parameters missing: tenantId. Ensure you have tenantId set in cookies.');
				}
			} catch (error) {
				console.error('Failed to edit the organization project setting', error);
			}
		},
		[tenantId, editOrganizationProjectSettingQueryCall]
	);

	const editOrganizationProject = useCallback(
		async (id: string, data: IEditProjectInput) => {
			try {
				const res = await editOrganizationProjectQueryCall(id, data);
				return res;
			} catch (error) {
				console.error('Failed to edit the organization project', error);
			}
		},
		[editOrganizationProjectQueryCall]
	);

	const getOrganizationProject = useCallback(
		async (id: string) => {
			try {
				return await getOrganizationProjectQueryCall(id);
			} catch (error) {
				console.error('Failed to get the organization project', error);
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
				console.error('Failed to get the organization projects', error);
			}
		},
		[getOrganizationProjectsQueryCall]
	);

	const createOrganizationProject = useCallback(
		async (data: Partial<ICreateProjectInput>) => {
			try {
				const res = await createOrganizationProjectQueryCall({ ...data, organizationId, tenantId });

				setOrganizationProjects([...organizationProjects, res.data]);

				return res.data;
			} catch (error) {
				console.error('Failed to create the organization project', error);
			}
		},
		[createOrganizationProjectQueryCall, organizationId, organizationProjects, setOrganizationProjects, tenantId]
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
		try {
			if (!user) return;
			if (organizationProjects.length) return;

			const res = await getOrganizationProjects();

			if (res) {
				setOrganizationProjects(res.items ?? []);
			}
		} catch (error) {
			console.error('Failed to load organization projects', error);
		}
	}, [user, organizationProjects, setOrganizationProjects, getOrganizationProjects]);

	const handleFirstLoad = useCallback(async () => {
		await loadOrganizationProjects();
		firstOrganizationProjectsLoad();
	}, [firstOrganizationProjectsLoad, loadOrganizationProjects]);

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
		setOrganizationProjects,
		firstLoadOrganizationProjectsData: handleFirstLoad
	};
}
