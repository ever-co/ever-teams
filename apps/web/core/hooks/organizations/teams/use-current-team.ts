'use client';

import { useMemo } from 'react';
import { useGetOrganizationTeamQuery } from './use-get-organization-teams-query';

export const useCurrentTeam = () => {
	const { data: activeTeamResult } = useGetOrganizationTeamQuery();
	const activeTeam = useMemo(() => activeTeamResult?.data ?? null, [activeTeamResult]);

	return activeTeam;
};
