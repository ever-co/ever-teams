import { getTimeLogs } from '@ever-teams/api';
import { IServerError, ITimeLog, LogType, TimerSource } from '@ever-teams/toolkit-types';
import { useTeamsContext } from '@lib/context/teams-context';
import { useCallback, useEffect, useState } from 'react';
import { DateRange } from 'react-day-picker';

interface IUseTimeLogsParams {
	date?: DateRange;
	activityLevel?: { start: number; end: number };
	timeZone?: string;
	source?: TimerSource[];
	logType?: LogType[];
}

export interface IUseTimeLogsReturn {
	loading: boolean;
	data: ITimeLog[] | null;
	error: IServerError | null;
	refetch: () => Promise<void>;
}

export const useTimeLogs = ({
	date,
	activityLevel,
	timeZone,
	source,
	logType
}: IUseTimeLogsParams = {}): IUseTimeLogsReturn => {
	const [loading, setLoading] = useState(false);
	const [data, setData] = useState<ITimeLog[] | null>(null);
	const [error, setError] = useState<IServerError | null>(null);

	const { authenticatedUser: user, token, selectedOrganization: organizationId, selectedEmployee } = useTeamsContext();

	const fetchTimeLogs = useCallback(async () => {
		setLoading(true);
		setError(null);

		try {
			const response = await getTimeLogs({
				user,
				token,
				organizationId,
				date,
				activityLevel,
				timeZone,
				source,
				logType,
				employeeIds: selectedEmployee !== 'all' ? [selectedEmployee] : undefined
			});

			if ('error' in response || 'message' in response) {
				setError(response as IServerError);
				setData(null);
			} else {
				setData(response as ITimeLog[]);
				setError(null);
			}
		} catch (err) {
			setError({ error: (err as Error).message, message: 'Failed to fetch time logs' } as IServerError);
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [user, token, organizationId, date, activityLevel, timeZone, source, logType, selectedEmployee]);

	useEffect(() => {
		user && organizationId && token && fetchTimeLogs();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetchTimeLogs]);

	return { loading, data, error, refetch: fetchTimeLogs };
};
