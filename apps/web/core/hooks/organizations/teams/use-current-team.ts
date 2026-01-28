'use client';

import { useMemo } from 'react';
import { useGetOrganizationTeamQuery } from './use-get-organization-teams-query';

/**
 * Retrieves the currently active team for the authenticated user.
 *
 * @description
 * Extracts and memoizes the active team from `useGetOrganizationTeamQuery`.
 * Returns `null` if no team is currently selected.
 *
 * @example
 * ```tsx
 * const activeTeam = useCurrentTeam();
 *
 * if (!activeTeam) return <p>No team selected</p>;
 * return <h1>{activeTeam.name}</h1>;
 * ```
 *
 * @see {@link useGetOrganizationTeamQuery} - Underlying query hook
 * @see {@link useSetActiveTeam} - Change the active team
 *
 * @returns {TOrganizationTeam  | null} Active team or `null`
 */
export const useCurrentTeam = () => {
	const { data: activeTeamResult } = useGetOrganizationTeamQuery();
	const activeTeam = useMemo(() => activeTeamResult?.data ?? null, [activeTeamResult]);

	return activeTeam;
};
