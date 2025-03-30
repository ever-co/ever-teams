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
import { useAtom } from 'jotai';
import { useQuery } from '../useQuery';
import cloneDeep from 'lodash/cloneDeep';

export const useRolePermissions = () => {
  const [rolePermissions, setrolePermissions] = useAtom(rolePermissionsState);
  const [rolePermissionsFormated, setRolePermissionsFormated] = useAtom(
    rolePermissionsFormatedState
  );

  const { loading, queryCall: getRolePermissionsQueryCall } = useQuery(
    getRolePermissionAPI
  );
  const {
    loading: updateRolePermissionLoading,
    queryCall: updateRoleQueryCall
  } = useQuery(updateRolePermissionAPI);

  const getRolePermissions = useCallback(
    (id: string) => {
      return getRolePermissionsQueryCall(id).then((response) => {
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
    [
      getRolePermissionsQueryCall,
      setRolePermissionsFormated,
      setrolePermissions
    ]
  );

  const updateRolePermission = useCallback(
    async (permission: IRolePermissions) => {
      return updateRoleQueryCall(permission).then(() => {
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
    [
      rolePermissions,
      rolePermissionsFormated,
      setRolePermissionsFormated,
      setrolePermissions,
      updateRoleQueryCall
    ]
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
