'use client';

import { useCallback } from 'react';
import { useStore } from 'jotai';
import { activeTeamState } from '@/core/stores';

/**
 * Reads the active team when a callback runs. For hooks that use the team only in their callbacks: subscribing to it
 * would re-render their component on every refresh of the team, for a value it does not render.
 */
export function useGetActiveTeam() {
	const store = useStore();
	return useCallback(() => store.get(activeTeamState), [store]);
}
