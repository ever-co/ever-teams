'use client';

/* eslint-disable react-hooks/exhaustive-deps */
import { ITaskVersionCreate } from '@app/interfaces';
import {
  createTaskVersionAPI,
  getTaskVersionList,
  deleteTaskVersionAPI,
  editTaskVersionAPI
} from '@app/services/client/api';
import {
  userState,
  taskVersionFetchingState,
  taskVersionListState,
  activeTeamIdState
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import isEqual from 'lodash/isEqual';
import { getActiveTeamIdCookie } from '@app/helpers';

export function useTaskVersion() {
  const [user] = useAtom(userState);
  const activeTeamId = useAtomValue(activeTeamIdState);

  const { loading, queryCall } = useQuery(getTaskVersionList);
  const {
    loading: createTaskVersionLoading,
    queryCall: createQueryCall
  } = useQuery(createTaskVersionAPI);
  const {
    loading: deleteTaskVersionLoading,
    queryCall: deleteQueryCall
  } = useQuery(deleteTaskVersionAPI);
  const {
    loading: editTaskVersionLoading,
    queryCall: editQueryCall
  } = useQuery(editTaskVersionAPI);

  const [taskVersion, setTaskVersion] = useAtom(taskVersionListState);

  const [taskVersionFetching, setTaskVersionFetching] = useAtom(
    taskVersionFetchingState
  );
  const { firstLoadData: firstLoadTaskVersionData, firstLoad } = useFirstLoad();

  useEffect(() => {
    if (firstLoad) {
      setTaskVersionFetching(loading);
    }
  }, [loading, firstLoad, setTaskVersionFetching]);

  const loadTaskVersionData = useCallback(() => {
    const teamId = getActiveTeamIdCookie();
    queryCall(
      user?.tenantId as string,
      user?.employee?.organizationId as string,
      activeTeamId || teamId || null
    ).then((res) => {
      if (!isEqual(res.data?.items || [], taskVersion)) {
        setTaskVersion(res.data?.items || []);
      }
      return res;
    });
  }, [user, activeTeamId, setTaskVersion, taskVersion]);

  useEffect(() => {
    if (!firstLoad) return;
    loadTaskVersionData();
  }, [activeTeamId, firstLoad]);

  const createTaskVersion = useCallback(
    (data: ITaskVersionCreate) => {
      if (user?.tenantId) {
        return createQueryCall(
          { ...data, organizationTeamId: activeTeamId },
          user?.tenantId || ''
        ).then((res) => {
          return res;
        });
      }
    },

    [
      createQueryCall,
      createTaskVersionLoading,
      deleteTaskVersionLoading,
      activeTeamId
    ]
  );

  const deleteTaskVersion = useCallback(
    (id: string) => {
      if (user?.tenantId) {
        return deleteQueryCall(id).then((res) => {
          queryCall(
            user?.tenantId as string,
            user?.employee?.organizationId as string,
            activeTeamId || null
          ).then((res) => {
            setTaskVersion(res.data?.items || []);
            return res;
          });
          return res;
        });
      }
    },
    [
      deleteQueryCall,
      taskVersion.length,
      createTaskVersionLoading,
      deleteTaskVersionLoading,
      user,
      activeTeamId
    ]
  );

  const editTaskVersion = useCallback(
    (id: string, data: ITaskVersionCreate) => {
      console.log(user);

      if (user?.tenantId) {
        return editQueryCall(id, data, user?.tenantId || '').then((res) => {
          queryCall(
            user?.tenantId as string,
            user?.employee?.organizationId as string,
            activeTeamId || null
          ).then((res) => {
            setTaskVersion(res.data?.items || []);
            return res;
          });
          return res;
        });
      }
    },
    [editTaskVersionLoading, user, activeTeamId]
  );

  return {
    loading: taskVersionFetching,
    taskVersion,
    taskVersionFetching,
    firstLoadTaskVersionData,
    createTaskVersion,
    createTaskVersionLoading,
    deleteTaskVersionLoading,
    deleteTaskVersion,
    editTaskVersionLoading,
    editTaskVersion,
    setTaskVersion,
    loadTaskVersionData
  };
}
