import { rolesState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQuery } from '../common/use-query';
import { useFirstLoad } from '../common/use-first-load';
import { IRole } from '@/core/types/interfaces/role/role';
import { roleService } from '@/core/services/client/api/roles';

export const useRoles = () => {
	const [roles, setRoles] = useAtom(rolesState);
	const { firstLoadData: firstRolesLoad } = useFirstLoad();
	const { loading, queryCall: getRolesQueryCall } = useQuery(roleService.getRoles);
	const { loading: createRoleLoading, queryCall: createRoleQueryCall } = useQuery(roleService.createRole);
	const { loading: updateRoleLoading, queryCall: updateRoleQueryCall } = useQuery(roleService.updateRole);
	const { loading: deleteRoleLoading, queryCall: deleteRoleQueryCall } = useQuery(roleService.deleteRole);

	const getRoles = useCallback(async () => {
		try {
			const res = await getRolesQueryCall();

			return res;
		} catch (error) {
			console.error('Failed to get roles', error);
		}
	}, [getRolesQueryCall]);

	const createRole = useCallback(
		async (role: Omit<IRole, 'id'>) => {
			try {
				const res = await createRoleQueryCall(role);

				return res;
			} catch (error) {
				console.error('Failed to create role', error);
			}
		},
		[createRoleQueryCall]
	);

	const updateRole = useCallback(
		async (role: IRole) => {
			try {
				const res = await updateRoleQueryCall(role);
				return res;
			} catch (error) {
				console.error('Failed to update role', error);
			}
		},
		[updateRoleQueryCall]
	);

	const deleteRole = useCallback(
		async (id: string) => {
			try {
				const res = await deleteRoleQueryCall(id);
				return res;
			} catch (error) {
				console.error('Failed to delete role:', error);
			}
		},
		[deleteRoleQueryCall]
	);

	const loadRoles = useCallback(async () => {
		try {
			const res = await getRoles();

			if (res) {
				setRoles(res.data.items);
				return;
			} else {
				throw new Error('Could not load roles');
			}
		} catch (error) {
			console.error('Failed to load roles', error);
		}
	}, [getRoles, setRoles]);

	const handleFirstRolesLoad = useCallback(() => {
		loadRoles();
		firstRolesLoad();
	}, [firstRolesLoad, loadRoles]);

	return {
		roles,
		setRoles,
		loading,
		getRoles,

		createRole,
		createRoleLoading,

		deleteRole,
		deleteRoleLoading,

		updateRole,
		updateRoleLoading,
		firstLoadRolesData: handleFirstRolesLoad
	};
};
