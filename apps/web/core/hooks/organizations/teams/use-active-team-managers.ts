import { useMemo } from 'react';
import { useCurrentTeam } from './use-current-team';
import { ERoleName } from '@/core/types/generics/enums/role';

// const { managers: activeTeamManagers } = useActiveTeamManagers();
export const useActiveTeamManagers = () => {
	const activeTeam = useCurrentTeam();

	const managers = useMemo(() => {
		const members = activeTeam?.members;
		return (
			members?.filter(
				(member) =>
					member?.role?.name === ERoleName.MANAGER ||
					member?.role?.name === ERoleName.SUPER_ADMIN ||
					member?.role?.name === ERoleName.ADMIN
			) || []
		);
	}, [activeTeam]);

	return { managers };
};
