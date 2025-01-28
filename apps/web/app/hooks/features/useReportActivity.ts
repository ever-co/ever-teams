import { useCallback, useEffect, useState, useMemo } from 'react';
import { ITimeLogReportDailyChartProps } from '@/app/interfaces/timer/ITimerLog';
import { getTimeLogReportDaily, getTimeLogReportDailyChart } from '@/app/services/client/api/timer/timer-log';
import { useAuthenticateUser } from './useAuthenticateUser';
import { useQuery } from '../useQuery';
import { useAtom } from 'jotai';
import { timeLogsRapportChartState, timeLogsRapportDailyState } from '@/app/stores';

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
    const [rapportDailyActivity, setRapportDailyActivity] = useAtom(timeLogsRapportDailyState);
    const { loading: loadingTimeLogReportDailyChart, queryCall: queryTimeLogReportDailyChart } = useQuery(getTimeLogReportDailyChart);
    const { loading: loadingTimeLogReportDaily, queryCall: queryTimeLogReportDaily } = useQuery(getTimeLogReportDaily);
    const [currentFilters, setCurrentFilters] = useState<Partial<UseReportActivityProps>>(defaultProps);

    // Memoize the merged props to avoid recalculation
    const getMergedProps = useMemo(() => {
        if (!user?.employee.organizationId) {
            return null;
        }

        return (customProps?: Partial<UseReportActivityProps>): ITimeLogReportDailyChartProps => ({
            ...defaultProps,
            ...currentFilters,
            ...(customProps || {}),
            organizationId: user.employee.organizationId,
            tenantId: user.tenantId ?? ''
        });
    }, [user?.employee.organizationId, user?.tenantId, currentFilters]);

    // Generic fetch function to reduce code duplication
    const fetchReport = useCallback(async <T>(
        queryFn: typeof queryTimeLogReportDailyChart | typeof queryTimeLogReportDaily,
        setData: (data: T[]) => void,
        customProps?: Partial<UseReportActivityProps>
    ) => {
        if (!user || !getMergedProps) {
            setData([]);
            return;
        }

        try {
            const mergedProps = getMergedProps(customProps);
            const { data } = await queryFn(mergedProps);

            setData(data as T[]);

            if (customProps) {
                setCurrentFilters(prev => ({
                    ...prev,
                    ...customProps
                }));
            }
        } catch (err) {
            console.error('Failed to fetch report:', err);
            setData([]);
        }
    }, [user, getMergedProps]);

    const fetchReportActivity = useCallback((customProps?: Partial<UseReportActivityProps>) =>
        fetchReport(queryTimeLogReportDailyChart, setRapportChartActivity, customProps),
    [fetchReport, queryTimeLogReportDailyChart, setRapportChartActivity]);

    const fetchDailyReport = useCallback((customProps?: Partial<UseReportActivityProps>) =>
        fetchReport(queryTimeLogReportDaily, setRapportDailyActivity, customProps),
    [fetchReport, queryTimeLogReportDaily, setRapportDailyActivity]);

    const updateDateRange = useCallback((startDate: Date, endDate: Date) => {
        const newProps = {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };

        Promise.all([
            fetchReportActivity(newProps),
            fetchDailyReport(newProps)
        ]).catch(console.error);
    }, [fetchReportActivity, fetchDailyReport]);

    const updateFilters = useCallback((newFilters: Partial<UseReportActivityProps>) => {
        Promise.all([
            fetchReportActivity(newFilters),
            fetchDailyReport(newFilters)
        ]).catch(console.error);
    }, [fetchReportActivity, fetchDailyReport]);

    useEffect(() => {
        if (user) {
            Promise.all([
                fetchReportActivity(),
                fetchDailyReport()
            ]).catch(console.error);
        }
    }, [user, fetchReportActivity, fetchDailyReport]);

    return {
        loadingTimeLogReportDailyChart,
        loadingTimeLogReportDaily,
        rapportChartActivity,
        rapportDailyActivity,
        updateDateRange,
        updateFilters,
        currentFilters
    };
}
