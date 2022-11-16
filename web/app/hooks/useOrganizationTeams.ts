import {
  getActiveTeamIdCookie,
  setActiveTeamIdCookie,
  setOrganizationIdCookie,
} from "@app/helpers/cookies";
import {
  createOrganizationTeamAPI,
  getOrganizationTeamsAPI,
} from "@app/services/client/api/organization-team";
import {
  activeTeamIdState,
  activeTeamState,
  organizationTeamsState,
  teamsFetchingState,
} from "@app/stores";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { useQuery } from "./useQuery";

function useCreateOrganizationTeam() {
  const { loading, queryCall } = useQuery(createOrganizationTeamAPI);
  const [teams, setTeams] = useRecoilState(organizationTeamsState);
  const teamsRef = useRef(teams);
  const setActiveTeamId = useSetRecoilState(activeTeamIdState);

  teamsRef.current = useMemo(() => (teamsRef.current = teams), [teams]);

  const createOrganizationTeam = useCallback((name: string) => {
    const teams = teamsRef.current;
    const $name = name.trim();
    const exits = teams.find(
      (t) => t.name.toLowerCase() === $name.toLowerCase()
    );

    if (exits || $name.length < 2) {
      return Promise.reject(new Error("Invalid team name !"));
    }

    return queryCall($name).then((res) => {
      const dt = res.data?.items || [];
      setTeams(dt);
      const created = dt.find((t) => t.name === $name);
      if (created) {
        setActiveTeamIdCookie(created.id);
        setOrganizationIdCookie(created.organizationId);
        // This must be called at the end (Update store)
        setActiveTeamId(created.id);
      }
      return res;
    });
  }, []);

  return {
    createOrganizationTeam,
    loading,
  };
}

export function useOrganizationTeams() {
  const { loading, queryCall } = useQuery(getOrganizationTeamsAPI);
  const [teams, setTeams] = useRecoilState(organizationTeamsState);
  const activeTeam = useRecoilValue(activeTeamState);
  const setActiveTeamId = useSetRecoilState(activeTeamIdState);
  const [teamsFetching, setTeamsFetching] = useRecoilState(teamsFetchingState);

  const { createOrganizationTeam, loading: createOTeamLoading } =
    useCreateOrganizationTeam();

  useEffect(() => {
    setTeamsFetching(loading);
  }, [loading]);

  const loadTeamsData = useCallback(() => {
    setActiveTeamId(getActiveTeamIdCookie());
    return queryCall().then((res) => {
      setTeams(res.data?.items || []);
      return res;
    });
  }, []);

  const setActiveTeam = useCallback(
    (teamId: typeof teams[0]) => {
      setActiveTeamIdCookie(teamId.id);
      setOrganizationIdCookie(teamId.organizationId);
      // This must be called at the end (Update store)
      setActiveTeamId(teamId.id);
    },
    [setActiveTeamId]
  );

  return {
    loadTeamsData,
    loading,
    teams,
    teamsFetching,
    activeTeam,
    setActiveTeam,
    createOrganizationTeam,
    createOTeamLoading,
  };
}
