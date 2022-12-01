import {
  getTeamInvitationsAPI,
  inviteByEmailsAPI,
} from "@app/services/client/api";
import {
  activeTeamIdState,
  fetchingTeamInvitationsState,
  teamInvitationsState,
} from "@app/stores";
import { useCallback, useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { useQuery } from "../useQuery";

export function useTeamInvitations() {
  const [teamInvitations, setTeamInvitations] =
    useRecoilState(teamInvitationsState);
  const [fetchingInvitations, setFetchingInvitations] = useRecoilState(
    fetchingTeamInvitationsState
  );

  const activeTeamId = useRecoilValue(activeTeamIdState);
  const [firstLoad, setLoadLoad] = useState(false);

  // Queries
  const { queryCall, loading } = useQuery(getTeamInvitationsAPI);
  const { queryCall: inviteQueryCall, loading: inviteLoading } =
    useQuery(inviteByEmailsAPI);

  /**
   * To be called once, at the top level component (e.g main.tsx)
   */
  const firstLoadTeamInvitationsData = useCallback(() => {
    setLoadLoad(true);
  }, []);

  const invateUser = useCallback((email: string, name: string) => {
    return inviteQueryCall({ email, name }).then((res) => {
      setTeamInvitations(res.data?.items || []);
      return res;
    });
  }, []);

  useEffect(() => {
    if (activeTeamId && firstLoad) {
      queryCall().then((res) => {
        setTeamInvitations(res.data?.items || []);
      });
    }
  }, [activeTeamId, firstLoad]);

  useEffect(() => {
    if (firstLoad) {
      setFetchingInvitations(loading);
    }
  }, [loading, firstLoad]);

  return {
    teamInvitations,
    firstLoadTeamInvitationsData,
    fetchingInvitations,
    inviteLoading,
    invateUser,
  };
}
