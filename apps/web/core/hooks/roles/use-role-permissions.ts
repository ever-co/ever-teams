import { rolePermissionsFormatedState, rolePermissionsState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { useQueryCall } from '../common/use-query';
import cloneDeep from 'lodash/cloneDeep';
import { rolePermissionService } from '@/core/services/client/api/roles/role-permission.service';
import { IRolePermission } from '@/core/types/interfaces/role/role-permission';

export const useRolePermissions = () => {
	const [rolePermissions, setrolePermissions] = useAtom(rolePermissionsState);
	const [rolePermissionsFormated, setRolePermissionsFormated] = useAtom(rolePermissionsFormatedState);

	const { loading, queryCall: getRolePermissionsQueryCall } = useQueryCall(rolePermissionService.getRolePermission);
	const { loading: updateRolePermissionLoading, queryCall: updateRoleQueryCall } = useQueryCall(
		rolePermissionService.updateRolePermission
	);

	const getRolePermissions = useCallback(
		(id: string) => {
			return getRolePermissionsQueryCall(id).then((response) => {
				if (response?.data?.items?.length) {
					const tempRolePermissions = response.data.items;
					const formatedItems: { [key: string]: IRolePermission } = {};

					tempRolePermissions.forEach((item: IRolePermission) => {
						formatedItems[item.permission] = item;
					});
					setRolePermissionsFormated(formatedItems);

					setrolePermissions(tempRolePermissions);
				}
			});
		},
		[getRolePermissionsQueryCall, setRolePermissionsFormated, setrolePermissions]
	);

	const updateRolePermission = useCallback(
		async (permission: IRolePermission) => {
			return updateRoleQueryCall(permission).then(() => {
				const index = rolePermissions.findIndex((item) => item.id === permission.id);
				const tempRoles = cloneDeep(rolePermissions);
				const formatedItems = cloneDeep(rolePermissionsFormated);
				if (index >= 0) {
					tempRoles[index].id = permission.id;
					formatedItems[permission.permission] = permission;
				}

				setRolePermissionsFormated(formatedItems);
				setrolePermissions(tempRoles);
			});
		},
		[rolePermissions, rolePermissionsFormated, setRolePermissionsFormated, setrolePermissions, updateRoleQueryCall]
	);

	return {
		loading,
		rolePermissions,
		getRolePermissions,
		updateRolePermission,
		updateRolePermissionLoading,
		rolePermissionsFormated
	};
};
