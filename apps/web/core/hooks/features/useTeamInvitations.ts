'use client';

import { MyInvitationActionEnum } from '@app/interfaces';
import {
  getTeamInvitationsAPI,
  inviteByEmailsAPI,
  removeTeamInvitationsAPI,
  resendTeamInvitationsAPI,
  getMyInvitationsAPI,
  acceptRejectMyInvitationsAPI
} from '@app/services/client/api';
import {
  activeTeamIdState,
  fetchingTeamInvitationsState,
  getTeamInvitationsState,
  myInvitationsState,
  teamInvitationsState
} from '@app/stores';
import { useCallback, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useFirstLoad } from '../useFirstLoad';
import { useQuery } from '../useQuery';
import { useAuthenticateUser } from './useAuthenticateUser';

export function useTeamInvitations() {
  const setTeamInvitations = useSetAtom(teamInvitationsState);
  const [myInvitationsList, setMyInvitationsList] = useAtom(myInvitationsState);

  const teamInvitations = useAtomValue(getTeamInvitationsState);
  const [fetchingInvitations, setFetchingInvitations] = useAtom(
    fetchingTeamInvitationsState
  );

  const activeTeamId = useAtomValue(activeTeamIdState);
  const {
    firstLoad,
    firstLoadData: firstLoadTeamInvitationsData
  } = useFirstLoad();

  const { isTeamManager, refreshToken } = useAuthenticateUser();

  // Queries
  const { queryCall, loading } = useQuery(getTeamInvitationsAPI);

  const { queryCall: inviteQueryCall, loading: inviteLoading } = useQuery(
    inviteByEmailsAPI
  );

  const {
    queryCall: removeInviteQueryCall,
    loading: removeInviteLoading
  } = useQuery(removeTeamInvitationsAPI);

  const {
    queryCall: resendInviteQueryCall,
    loading: resendInviteLoading
  } = useQuery(resendTeamInvitationsAPI);

  const {
    queryCall: myInvitationsQueryCall,
    loading: myInvitationsLoading,
    loadingRef: myInvitationsLoadingRef
  } = useQuery(getMyInvitationsAPI);

  const {
    queryCall: acceptRejectMyInvitationsQueryCall,
    loading: acceptRejectMyInvitationsLoading
  } = useQuery(acceptRejectMyInvitationsAPI);

  const { user } = useAuthenticateUser();

  const inviteUser = useCallback(
    (email: string, name: string) => {
      return inviteQueryCall(
        {
          email,
          name,
          organizationId: user?.employee.organizationId as string,
          teamId: activeTeamId as string
        },
        user?.tenantId as string
      ).then((res) => {
        setTeamInvitations((prev) => [...prev, ...(res.data?.items || [])]);
        return res;
      });
    },
    [
      inviteQueryCall,
      setTeamInvitations,
      user?.tenantId,
      activeTeamId,
      user?.employee.organizationId
    ]
  );

  useEffect(() => {
    if (activeTeamId && firstLoad && isTeamManager && user?.tenantId) {
      queryCall(
        user?.tenantId,
        user.employee.organizationId,
        'EMPLOYEE',
        activeTeamId
      ).then((res) => {
        setTeamInvitations(res.data?.items || []);
      });
    }
  }, [
    activeTeamId,
    firstLoad,
    isTeamManager,
    queryCall,
    setTeamInvitations,
    user
  ]);

  useEffect(() => {
    if (firstLoad) {
      setFetchingInvitations(loading);
    }
  }, [loading, firstLoad, setFetchingInvitations]);

  const removeTeamInvitation = useCallback(
    (invitationId: string) => {
      if (!(activeTeamId && isTeamManager && user?.tenantId)) {
        return;
      }

      removeInviteQueryCall(
        invitationId,
        user.tenantId,
        user.employee.organizationId,
        'EMPLOYEE',
        activeTeamId
      ).then((res) => {
        setTeamInvitations(res.data?.items || []);
      });
    },
    [
      removeInviteQueryCall,
      setTeamInvitations,
      activeTeamId,
      isTeamManager,
      user
    ]
  );

  const resendTeamInvitation = useCallback(
    (invitationId: string) => {
      return resendInviteQueryCall(invitationId);
    },
    [resendInviteQueryCall]
  );

  const myInvitations = useCallback(() => {
    if (myInvitationsLoadingRef.current || !user?.tenantId) {
      return;
    }

    myInvitationsQueryCall(user.tenantId).then((res) => {
      setMyInvitationsList(res.data.items);
      return res.data;
    });
  }, [
    myInvitationsQueryCall,
    setMyInvitationsList,
    user,
    myInvitationsLoadingRef
  ]);
  const removeMyInvitation = useCallback(
    (id: string) => {
      setMyInvitationsList(
        myInvitationsList.filter((invitation) => invitation.id !== id)
      );
    },
    [myInvitationsList, setMyInvitationsList]
  );
  const acceptRejectMyInvitation = useCallback(
    (id: string, action: MyInvitationActionEnum) => {
      return acceptRejectMyInvitationsQueryCall(id, action).then((res) => {
        if (res.data.message) {
          return res.data;
        }

        if (action === MyInvitationActionEnum.ACCEPTED) {
          refreshToken().then(() => {
            window.location.reload();
          });
        }
        setMyInvitationsList(
          myInvitationsList.filter((invitation) => invitation.id !== id)
        );
        return res.data;
      });
    },
    [
      acceptRejectMyInvitationsQueryCall,
      myInvitationsList,
      refreshToken,
      setMyInvitationsList
    ]
  );

  return {
    teamInvitations,
    firstLoadTeamInvitationsData,
    fetchingInvitations,
    inviteLoading,
    inviteUser,
    removeTeamInvitation,
    resendTeamInvitation,
    removeInviteLoading,
    resendInviteLoading,
    myInvitationsQueryCall,
    myInvitationsLoading,
    myInvitations,
    myInvitationsList,
    removeMyInvitation,
    acceptRejectMyInvitation,
    acceptRejectMyInvitationsLoading
  };
}
