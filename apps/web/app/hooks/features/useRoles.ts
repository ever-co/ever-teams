import { IRole } from '@app/interfaces';
import { createRoleAPI, deleteRoleAPI, getRolesAPI, updateRoleAPI } from '@app/services/client/api';
import { rolesState } from '@app/stores/';
import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { useQuery } from '../useQuery';
import cloneDeep from 'lodash/cloneDeep';

export const useRoles = () => {
	const [roles, setRoles] = useRecoilState(rolesState);

	const { loading, queryCall: getRolesQueryCall } = useQuery(getRolesAPI);
	const { loading: createRoleLoading, queryCall: createRoleQueryCall } = useQuery(createRoleAPI);
	const { loading: updateRoleLoading, queryCall: updateRoleQueryCall } = useQuery(updateRoleAPI);
	const { loading: deleteRoleLoading, queryCall: deleteRoleQueryCall } = useQuery(deleteRoleAPI);

	const getRoles = useCallback(() => {
		getRolesQueryCall().then((response) => {
			if (response.data.items.length) {
				setRoles(response.data.items);
			}
		});
	}, [getRolesQueryCall, setRoles]);

	const createRole = useCallback(
		async (role: IRole) => {
			createRoleQueryCall(role).then((response) => {
				setRoles([response.data, ...roles]);
			});
		},
		[roles, createRoleQueryCall, setRoles]
	);

	const updateRole = useCallback(
		async (role: IRole) => {
			updateRoleQueryCall(role).then(() => {
				const index = roles.findIndex((item) => item.id === role.id);
				const tempRoles = cloneDeep(roles);
				if (index >= 0) {
					tempRoles[index].name = role.name;
				}

				setRoles(tempRoles);
			});
		},
		[roles, setRoles, updateRoleQueryCall]
	);

	const deleteRole = useCallback(
		async (id: string) => {
			deleteRoleQueryCall(id).then(() => {
				setRoles(roles.filter((role) => role.id !== id));
			});
		},
		[deleteRoleQueryCall, setRoles, roles]
	);

	return {
		roles,
		loading,
		getRoles,

		createRole,
		createRoleLoading,

		deleteRole,
		deleteRoleLoading,

		updateRole,
		updateRoleLoading
	};
};
