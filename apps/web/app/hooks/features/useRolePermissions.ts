import { IRolePermissions } from '@app/interfaces';
import {
	getRolePermissionAPI,
	updateRolePermissionAPI
} from '@app/services/client/api';
import {
	rolePermissionsFormatedState,
	rolePermissionsState
} from '@app/stores/';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useQuery } from '../useQuery';
import cloneDeep from 'lodash/cloneDeep';

export const useRolePermissions = () => {
	const [rolePermissions, setrolePermissions] =
		useRecoilState(rolePermissionsState);
	const [rolePermissionsFormated, setRolePermissionsFormated] = useRecoilState(
		rolePermissionsFormatedState
	);

	const { loading, queryCall: getRolePermissionsQueryCall } =
		useQuery(getRolePermissionAPI);
	const {
		loading: updateRolePermissionLoading,
		queryCall: updateRoleQueryCall
	} = useQuery(updateRolePermissionAPI);

	const getRolePermissions = useCallback(
		(id: string) => {
			getRolePermissionsQueryCall(id).then((response) => {
				if (response.data.items.length) {
					const tempRolePermissions = response.data.items;
					const formatedItems: { [key: string]: IRolePermissions } = {};

					tempRolePermissions.forEach((item) => {
						formatedItems[item.permission] = item;
					});
					setRolePermissionsFormated(formatedItems);

					setrolePermissions(tempRolePermissions);
				}
			});
		},
		[getRolePermissionsQueryCall]
	);

	const updateRolePermission = useCallback(
		async (permission: IRolePermissions) => {
			updateRoleQueryCall(permission).then(() => {
				const index = rolePermissions.findIndex(
					(item) => item.id === permission.id
				);
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
		[rolePermissions]
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
