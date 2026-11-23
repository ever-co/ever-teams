import { useEffect, useState } from 'react';

import { getTimerStatus } from '@ever-teams/api';
import { IHookResponse, ITimerStatus, IUser } from '@ever-teams/toolkit-types';
import { toast } from '@ever-teams/toolkit-ui';
import {
	TIMER_STATUS_REFRESH_MS,
	errorMessageOf,
	useTimerStatusContext
} from '@lib/context/teams-timer-status-context';
import { useKitOptions } from '@components/teams-provider/kit-options';

/**
 * The timer status of the signed-in employee. Under a TeamsProvider every caller shares one read (see
 * TimerStatusProvider). Outside one, the hook reads it on its own, as it did before the provider existed.
 */
const useTimerStatus = (user: IUser | null, token: string, organizationId?: string): IHookResponse<ITimerStatus> => {
	const shared = useTimerStatusContext();
	const registerConsumer = shared?.registerConsumer;
	useEffect(() => registerConsumer?.(), [registerConsumer]);

	const ownStatus = useOwnTimerStatus(user, token, organizationId, !shared);
	if (shared) {
		return { data: shared.status, loading: shared.loading };
	}
	return ownStatus;
};

function useOwnTimerStatus(
	user: IUser | null,
	token: string,
	organizationId: string | undefined,
	enabled: boolean
): IHookResponse<ITimerStatus> {
	const [timerStatus, setTimerStatus] = useState<IHookResponse<ITimerStatus>>({
		data: null,
		loading: false
	});
	const { api } = useKitOptions();

	const fetchTimerStatus = async (): Promise<void> => {
		try {
			setTimerStatus((prev) => ({ ...prev, loading: true }));
			const userTimerStatus = await getTimerStatus(user, token, organizationId, api);

			if ('message' in userTimerStatus || 'error' in userTimerStatus) {
				toast({
					variant: 'destructive',
					description: errorMessageOf(userTimerStatus)
				});

				return;
			}

			setTimerStatus((prev) => ({ ...prev, data: userTimerStatus, loading: false }));
		} catch (error) {
			toast({
				variant: 'destructive',
				description: (error as Error).message
			});
		} finally {
			setTimerStatus((prev) => ({ ...prev, loading: false }));
		}
	};

	useEffect(() => {
		const signedIn = Boolean(user?.employee && token && organizationId);
		if (enabled && signedIn) {
			fetchTimerStatus(); // Initial fetch on mount
			const interval = setInterval(fetchTimerStatus, TIMER_STATUS_REFRESH_MS);
			return () => clearInterval(interval);
		}
	}, [user, token, organizationId, enabled, api]);

	return timerStatus;
}

export { useTimerStatus };
