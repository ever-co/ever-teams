import { useEffect, useState } from 'react';

import { getTimerStatus } from '@ever-teams/api';
import { IHookResponse, ITimerStatus, IUser } from '@ever-teams/toolkit-types';
import { toast } from '@ever-teams/toolkit-ui';

const CHECK_STATUS_DELAY = 30000;

const useTimerStatus = (user: IUser | null, token: string, organizationId?: string): IHookResponse<ITimerStatus> => {
	const [timerStatus, setTimerStatus] = useState<IHookResponse<ITimerStatus>>({
		data: null,
		loading: false
	});

	const fetchTimerStatus = async (): Promise<void> => {
		try {
			setTimerStatus((prev) => ({ ...prev, loading: true }));
			const userTimerStatus = await getTimerStatus(user, token, organizationId);

			if ('message' in userTimerStatus || 'error' in userTimerStatus) {
				const errorMessage =
					'message' in userTimerStatus
						? Array.isArray(userTimerStatus.message)
							? userTimerStatus.message.join(', ')
							: userTimerStatus.message
						: String(userTimerStatus.error);

				toast({
					variant: 'destructive',
					description: errorMessage
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
		if (user && user.employee && token && organizationId) {
			fetchTimerStatus(); // Initial fetch on mount
			const interval = setInterval(fetchTimerStatus, CHECK_STATUS_DELAY);
			return () => clearInterval(interval);
		}
	}, [user, organizationId]);

	return timerStatus;
};

export { useTimerStatus };
