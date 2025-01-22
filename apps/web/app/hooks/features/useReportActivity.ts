import { useCallback, useEffect } from 'react';
import { ITimeLogReportDailyChartProps } from '@/app/interfaces/timer/ITimerLog';
import { getTimeLogReportDailyChart } from '@/app/services/client/api/timer/timer-log';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useQuery } from '../useQuery';
import { useAtom } from 'jotai';
import { timeLogsRapportChartState } from '@/app/stores';

type UseReportActivityProps = Omit<ITimeLogReportDailyChartProps, 'organizationId' | 'tenantId'>;



export function useReportActivity(props: UseReportActivityProps) {
    const { user } = useAuthenticateUser();
    const [rapportChartActivity, setRapportChartActivity] = useAtom(timeLogsRapportChartState);
    const { loading: loadingTimeLogReportDailyChart, queryCall: queryTimeLogReportDailyChart } = useQuery(getTimeLogReportDailyChart);

    const fetchReportActivity = useCallback(async () => {
        if (!user) {
            return;
        }
        try {
            const { data } = await queryTimeLogReportDailyChart({
                ...props,
                organizationId: user?.employee.organizationId,
                tenantId: user?.tenantId ?? ''
            });

            if (data) {
                setRapportChartActivity(data);
            } else {
                setRapportChartActivity([]);
            }

        } catch (err) {
            console.error('Failed to fetch activity report:', err);
            setRapportChartActivity([]);
        }
    }, [user, queryTimeLogReportDailyChart, props, setRapportChartActivity]);


    useEffect(() => {
        if (user) {
            fetchReportActivity();
        }
    }, [user, fetchReportActivity]);

    return {
        loadingTimeLogReportDailyChart,
        rapportChartActivity
    };
}
