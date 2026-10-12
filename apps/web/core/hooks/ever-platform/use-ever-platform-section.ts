'use client';

import { IS_DEMO_MODE } from '@/core/constants/config/constants';
import { useEverConnectAvailable } from './use-ever-connect';
import { useEverStatsView } from './use-ever-stats';

/**
 * Whether the "Ever Platform" section of the team settings shows, for team managers only and never on a
 * demo deployment (NEXT_PUBLIC_DEMO=true):
 *
 * - its connection parts when NEXT_PUBLIC_EVER_CONNECT_ENABLED is 'true' and the paired API's
 *   `health` answers 200 to the signed-in person;
 * - its anonymous usage statistics card when this web app runs its statistics module (the card then
 *   shows the operator's view, or who manages the statistics).
 *
 * Nothing is asked for anyone else: no `health` call, no statistics call.
 */
export function useEverPlatformSection(isTeamManager: boolean) {
	const active = isTeamManager && !IS_DEMO_MODE;
	const connect = useEverConnectAvailable(active);
	const stats = useEverStatsView(active);
	const statsShown = stats.data?.kind === 'operator' || stats.data?.kind === 'managed';
	return {
		visible: active && (connect.available || statsShown),
		connect,
		stats
	};
}
