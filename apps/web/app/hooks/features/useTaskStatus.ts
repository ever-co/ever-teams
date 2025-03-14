'use client';

import { ITaskStatusCreate } from '@app/interfaces';
import {
  createTaskStatusAPI,
  getTaskStatusList,
  deleteTaskStatusAPI,
  editTaskStatusAPI,
  editTaskStatusOrderAPI
} from '@app/services/client/api';
import {
  userState,
  taskStatusFetchingState,
  taskStatusListState,
  activeTeamIdState
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import { getActiveTeamIdCookie } from '@app/helpers';

export function useTaskStatus() {
  const [user] = useAtom(userState);
  const activeTeamId = useAtomValue(activeTeamIdState);

  const { loading, queryCall, loadingRef } = useQuery(getTaskStatusList);
  const {
    loading: createTaskStatusLoading,
    queryCall: createQueryCall
  } = useQuery(createTaskStatusAPI);
  const {
    loading: deleteTaskStatusLoading,
    queryCall: deleteQueryCall
  } = useQuery(deleteTaskStatusAPI);
  const { loading: editTaskStatusLoading, queryCall: editQueryCall } = useQuery(
    editTaskStatusAPI
  );
  const {
    loading: reOrderTaskStatusLoading,
    queryCall: reOrderQueryCall
  } = useQuery(editTaskStatusOrderAPI);

  const [taskStatus, setTaskStatus] = useAtom(taskStatusListState);
  const [taskStatusFetching, setTaskStatusFetching] = useAtom(
    taskStatusFetchingState
  );
  const { firstLoadData: firstLoadTaskStatusData, firstLoad } = useFirstLoad();

  useEffect(() => {
    if (firstLoad) {
      setTaskStatusFetching(loading);
    }
  }, [loading, firstLoad, setTaskStatusFetching]);

  const loadTaskStatusData = useCallback(() => {
    if (loadingRef.current) {
      return;
    }
    const teamId = getActiveTeamIdCookie();
    queryCall(
      user?.tenantId as string,
      user?.employee?.organizationId as string,
      activeTeamId || teamId || null
    ).then((res) => {
      setTaskStatus(res.data?.items || []);
      return res;
    });
  }, [user, activeTeamId, setTaskStatus, queryCall, loadingRef]);

  useEffect(() => {
    if (user?.tenantId && (activeTeamId || getActiveTeamIdCookie())) {
    //   loadTaskStatusData();
    }
  }, [user?.tenantId, activeTeamId, loadTaskStatusData]);

  useEffect(() => {
    if (firstLoad) {
      loadTaskStatusData();
    }
  }, [loadTaskStatusData, firstLoad]);

  const createTaskStatus = useCallback(
    (data: ITaskStatusCreate) => {
      if (user?.tenantId) {
        return createQueryCall(
          { ...data, organizationTeamId: activeTeamId },
          user?.tenantId || ''
        ).then((res) => {
          return res;
        });
      }
    },

    [createQueryCall, activeTeamId, user]
  );

  const deleteTaskStatus = useCallback(
    (id: string) => {
      if (user?.tenantId) {
        return deleteQueryCall(id).then((res) => {
          queryCall(
            user?.tenantId as string,
            user?.employee?.organizationId as string,
            activeTeamId || null
          ).then((res) => {
            setTaskStatus(res.data?.items || []);
            return res;
          });
          return res;
        });
      }
    },
    [deleteQueryCall, user, activeTeamId, queryCall, setTaskStatus]
  );

  const editTaskStatus = useCallback(
    (id: string, data: ITaskStatusCreate) => {
      if (user?.tenantId) {
        return editQueryCall(id, data, user?.tenantId || '').then((res) => {
          queryCall(
            user?.tenantId as string,
            user?.employee?.organizationId as string,
            activeTeamId || null
          ).then((res) => {
            setTaskStatus(res.data?.items || []);
            return res;
          });
          return res;
        });
      }
    },
    [user, activeTeamId, editQueryCall, queryCall, setTaskStatus]
  );

  return {
    loading: taskStatusFetching,
    taskStatus,
    taskStatusFetching,
    firstLoadTaskStatusData,
    createTaskStatus,
    reOrderQueryCall,
    reOrderTaskStatusLoading,
    createTaskStatusLoading,
    deleteTaskStatusLoading,
    deleteTaskStatus,
    editTaskStatusLoading,
    editTaskStatus,
    setTaskStatus,
    loadTaskStatusData
  };
}
