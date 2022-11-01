import {
  getActiveTeamIdCookie,
  setActiveTeamIdCookie,
} from "@app/helpers/cookies";
import { getOrganizationTeamsAPI } from "@app/services/client/api/organization-team";
import {
  activeTeamIdState,
  activeTeamState,
  organizationTeamsState,
} from "@app/stores";
import { useCallback } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { useQuery } from "./useQuery";

export function useOrganizationTeams() {
  const { loading, queryCall } = useQuery(getOrganizationTeamsAPI);
  const [teams, setTeams] = useRecoilState(organizationTeamsState);
  const activeTeam = useRecoilValue(activeTeamState);
  const setActiveTeamId = useSetRecoilState(activeTeamIdState);

  const loadTeamsData = useCallback(() => {
    setActiveTeamId(getActiveTeamIdCookie());
    return queryCall().then((res) => {
      setTeams(res.data?.items || []);
      return res;
    });
  }, []);

  const setActiveTeam = useCallback(
    (teamId: string) => {
      setActiveTeamId(teamId);
      setActiveTeamIdCookie(teamId);
    },
    [setActiveTeamId]
  );

  return {
    loadTeamsData,
    loading,
    teams,
    activeTeam,
    setActiveTeam,
  };
}
