import { useCallback, useEffect, useState } from 'react';
import { ITimeLogReportDailyChartProps } from '@/app/interfaces/timer/ITimerLog';
import { getTimeLogReportDailyChart } from '@/app/services/client/api/timer/timer-log';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useQuery } from '../useQuery';
import { useAtom } from 'jotai';
import { timeLogsRapportChartState } from '@/app/stores';

type UseReportActivityProps = Omit<ITimeLogReportDailyChartProps, 'organizationId' | 'tenantId'>;

const getDefaultDates = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
};

const defaultProps: UseReportActivityProps = {
    activityLevel: { start: 0, end: 100 },
    ...getDefaultDates(),
    start: 0,
    end: 100
};

export function useReportActivity() {
    const { user } = useAuthenticateUser();
    const [rapportChartActivity, setRapportChartActivity] = useAtom(timeLogsRapportChartState);
    const { loading: loadingTimeLogReportDailyChart, queryCall: queryTimeLogReportDailyChart } = useQuery(getTimeLogReportDailyChart);
    const [currentFilters, setCurrentFilters] = useState<Partial<UseReportActivityProps>>(defaultProps);

    const fetchReportActivity = useCallback(async (customProps?: Partial<UseReportActivityProps>) => {
        if (!user) return;
        try {
            const mergedProps = {
                ...defaultProps,
                ...currentFilters,
                ...(customProps || {}),
                organizationId: user?.employee.organizationId,
                tenantId: user?.tenantId ?? ''
            };
            const { data } = await queryTimeLogReportDailyChart(mergedProps);
            if (data) {
                setRapportChartActivity(data);
                if (customProps) {
                    setCurrentFilters(prev => ({
                        ...prev,
                        ...customProps
                    }));
                }
            } else {
                setRapportChartActivity([]);
            }
        } catch (err) {
            console.error('Failed to fetch activity report:', err);
            setRapportChartActivity([]);
        }
    }, [user, queryTimeLogReportDailyChart, currentFilters, setRapportChartActivity]);

    const updateDateRange = useCallback((startDate: Date, endDate: Date) => {
        const newProps = {
            ...currentFilters,
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };
        fetchReportActivity(newProps);
    }, [fetchReportActivity, currentFilters]);

    const updateFilters = useCallback((newFilters: Partial<UseReportActivityProps>) => {
        fetchReportActivity(newFilters);
    }, [fetchReportActivity]);

    const initialFetch = useCallback(() => {
        if (user) {
            fetchReportActivity();
        }
    }, [user, fetchReportActivity]);

    useEffect(() => {
        initialFetch();
    }, [initialFetch]);


    return {
        loadingTimeLogReportDailyChart,
        rapportChartActivity,
        updateDateRange,
        updateFilters,
        currentFilters
    };
}
