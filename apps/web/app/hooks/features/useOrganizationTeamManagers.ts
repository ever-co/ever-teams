import { useAtomValue } from 'jotai';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useOrganizationTeams } from './useOrganizationTeams';
import { filterValue } from '@app/stores/all-teams';
import { useMemo } from 'react';

export function useOrganizationAndTeamManagers() {
  const { user } = useAuthenticateUser();
  const { teams } = useOrganizationTeams();
  const { value: filtered } = useAtomValue(filterValue);

  const userManagedTeams = useMemo(() => {
    return teams.filter((team) =>
      team.members.some(
        (member) =>
          member.employee?.user?.id === user?.id &&
          member.role?.name === 'MANAGER'
      )
    );
  }, [teams, user]);

  const filteredTeams = useMemo(() => {
    return filtered === 'all'
      ? userManagedTeams
      : filtered === 'pause'
      ? userManagedTeams.map((team) => ({
          ...team,
          members: team.members.filter(
            (member) => member.timerStatus === 'pause'
          )
        }))
      : filtered === 'running'
      ? userManagedTeams.map((team) => ({
          ...team,
          members: team.members.filter(
            (member) => member.timerStatus === 'running'
          )
        }))
      : filtered === 'suspended'
      ? userManagedTeams.map((team) => ({
          ...team,
          members: team.members.filter(
            (member) => member.timerStatus === 'suspended'
          )
        }))
      : filtered === 'invited'
      ? userManagedTeams.map((team) => ({
          ...team,
          members: team.members.filter((member) => member.employee.acceptDate)
        }))
      : userManagedTeams;
  }, [filtered, userManagedTeams]);

  return {
    userManagedTeams,
    filteredTeams
  };
}
