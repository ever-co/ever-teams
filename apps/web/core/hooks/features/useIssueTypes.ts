'use client';

import { IIssueTypesCreate } from '@app/interfaces';
import {
  createIssueTypeAPI,
  getIssueTypeList,
  deleteIssueTypeAPI,
  editIssueTypeAPI
} from '@app/services/client/api';
import {
  userState,
  issueTypesFetchingState,
  issueTypesListState,
  activeTeamIdState
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';

export function useIssueType() {
  const [user] = useAtom(userState);
  const activeTeamId = useAtomValue(activeTeamIdState);

  const { loading, queryCall } = useQuery(getIssueTypeList);
  const {
    loading: createIssueTypeLoading,
    queryCall: createQueryCall
  } = useQuery(createIssueTypeAPI);
  const {
    loading: deleteIssueTypeLoading,
    queryCall: deleteQueryCall
  } = useQuery(deleteIssueTypeAPI);
  const { loading: editIssueTypeLoading, queryCall: editQueryCall } = useQuery(
    editIssueTypeAPI
  );

  const [issueTypes, setIssueTypes] = useAtom(issueTypesListState);
  const [issueTypeFetching, setIssueTypesFetching] = useAtom(
    issueTypesFetchingState
  );
  const { firstLoadData: firstLoadIssueTypeData, firstLoad } = useFirstLoad();

  useEffect(() => {
    if (firstLoad) {
      setIssueTypesFetching(loading);
    }
  }, [loading, firstLoad, setIssueTypesFetching]);

  useEffect(() => {
    if (!firstLoad) return;

    queryCall(
      user?.tenantId as string,
      user?.employee?.organizationId as string,
      activeTeamId || null
    ).then((res) => {
      setIssueTypes(res.data?.items || []);
      return res;
    });
  }, [
    activeTeamId,
    firstLoad,
    queryCall,
    setIssueTypes,
    user?.employee?.organizationId,
    user?.tenantId
  ]);

  const createIssueType = useCallback(
    (data: IIssueTypesCreate) => {
      if (user?.tenantId) {
        return createQueryCall(
          { ...data, organizationTeamId: activeTeamId },
          user?.tenantId || ''
        ).then((res) => {
          if (res.data && res.data?.name) {
            queryCall(
              user?.tenantId as string,
              user?.employee?.organizationId as string,
              activeTeamId || null
            ).then((res) => {
              setIssueTypes(res?.data?.items || []);
              return res;
            });
          }

          return res;
        });
      }
    },

    [
      createQueryCall,
      activeTeamId,
      queryCall,
      setIssueTypes,
      user?.employee?.organizationId,
      user?.tenantId
    ]
  );

  const deleteIssueType = useCallback(
    (id: string) => {
      if (user?.tenantId) {
        return deleteQueryCall(id).then((res) => {
          queryCall(
            user?.tenantId as string,
            user?.employee?.organizationId as string,
            activeTeamId || null
          ).then((res) => {
            setIssueTypes(res?.data?.items || []);
            return res;
          });
          return res;
        });
      }
    },
    [deleteQueryCall, user, activeTeamId, queryCall, setIssueTypes]
  );

  const editIssueType = useCallback(
    (id: string, data: IIssueTypesCreate) => {
      if (user?.tenantId) {
        return editQueryCall(id, data, user?.tenantId || '').then((eRes) => {
          queryCall(
            user?.tenantId as string,
            user?.employee?.organizationId as string,
            activeTeamId || null
          ).then((res) => {
            setIssueTypes(res?.data?.items || []);
            return res;
          });

          return eRes;
        });
      }
    },
    [user, activeTeamId, editQueryCall, queryCall, setIssueTypes]
  );

  return {
    loading: issueTypeFetching,
    issueTypes,
    issueTypeFetching,
    firstLoadIssueTypeData,
    createIssueType,
    createIssueTypeLoading,
    deleteIssueTypeLoading,
    deleteIssueType,
    editIssueTypeLoading,
    editIssueType
  };
}
