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
} from "@app/stores";
import { useCallback, useMemo, useRef } from "react";
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
        setActiveTeamId(created.id);
        setActiveTeamIdCookie(created.id);
        setOrganizationIdCookie(created.organizationId);
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

  const { createOrganizationTeam, loading: createOTeamLoading } =
    useCreateOrganizationTeam();

  const loadTeamsData = useCallback(() => {
    setActiveTeamId(getActiveTeamIdCookie());
    return queryCall().then((res) => {
      setTeams(res.data?.items || []);
      return res;
    });
  }, []);

  const setActiveTeam = useCallback(
    (teamId: typeof teams[0]) => {
      setActiveTeamId(teamId.id);
      setActiveTeamIdCookie(teamId.id);
      setOrganizationIdCookie(teamId.organizationId);
    },
    [setActiveTeamId]
  );

  return {
    loadTeamsData,
    loading,
    teams,
    activeTeam,
    setActiveTeam,
    createOrganizationTeam,
    createOTeamLoading,
  };
}
