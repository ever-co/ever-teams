import { useCallback, useEffect, useRef } from "react";
import { useStores } from "../../../models";
import { ITeamTask } from "../../interfaces/ITask";
import { ITasksTimesheet } from "../../interfaces/ITimer";
import { useFirstLoad } from "../useFirstLoad";
import { useSyncRef } from "../useSyncRef";
import debounce from "lodash/debounce"
import { tasksStatistics } from "../../client/api/timer/tasksStatistics";

export function useTaskStatistics(addSeconds = 0) {
    const { TaskStore: {
        activeTask,
        setActiveTask,
        activeTaskId,
        tasksStatisticsState,
        setTasksStatisticsState,
        statActiveTask,
        setStatActiveTask,
        fetchingTasks,
        setFetchingTasks
    },
        TimerStore: {
            timerStatus
        },
        authenticationStore: { tenantId, authToken, organizationId }
    } = useStores();


    const { firstLoad, firstLoadData: firstLoadtasksStatisticsData } =
        useFirstLoad();


    // Refs
    const initialLoad = useRef(false);
    const statTasksRef = useSyncRef(tasksStatisticsState);

    // Dep status
    const activeTeamTask = activeTask

    /**
     * Get employee all tasks statistics  (API Call)
     */
    const getAllTasksStatsData = useCallback(async () => {
        const { data } = await tasksStatistics({
            tenantId,
            bearer_token: authToken,
            organizationId,
            activeTask: false,
            taskId: activeTask?.id,
        })

        setTasksStatisticsState({
            all: data.global || [],
            today: data.today || [],
        });
    }, []);

    const getTaskStat = useCallback((task: ITeamTask | null) => {
        const stats = statTasksRef.current
        return {
            taskTotalStat: stats && stats.all.find((t) => t.id === task?.id) || [],
            taskDailyStat: stats && stats.today.find((t) => t.id === task?.id) || [],
        };
    }, []);

    /**
     * Get statistics of the active tasks fresh (API Call)
     */
    const getActiveTaskStatData = useCallback(async () => {
        setFetchingTasks(true)
        const { data } = await tasksStatistics({
            tenantId,
            bearer_token: authToken,
            organizationId,
            activeTask: true,
            taskId: activeTask?.id,
        })

        setStatActiveTask({
            total: data.global ? data.global[0] || null : null,
            today: data.today ? data.today[0] || null : null,
        });
        return data;
    }, [activeTask]);

    const debounceLoadActiveTaskStat = useCallback(
		debounce(getActiveTaskStatData, 100),
		[]
	);

    /**
     * Get statistics of the active tasks at the component load
     */
    useEffect(() => {
        if (!firstLoad) {
            getActiveTaskStatData().then(() => {
                initialLoad.current = true;
            });
            getAllTasksStatsData();
        }
    }, [firstLoad]);

    /**
     * Get fresh statistic of the active task
     */
    useEffect(() => {
        if (!firstLoad && initialLoad.current) {
            debounceLoadActiveTaskStat()
        }
    }, [firstLoad, timerStatus, activeTeamTask?.id]);

    /**
     * set null to active team stats when active team or active task are changed
     */
    useEffect(() => {
        if (!firstLoad && initialLoad.current) {
            setStatActiveTask({
                today: null,
                total: null,
            });
        }
    }, [firstLoad, activeTeamTask?.id]);

    const getEstimation = (_task: ITasksTimesheet | null) =>
        Math.min(
            Math.floor(
                (((_task?.duration || 0) + addSeconds) * 100) /
                (activeTeamTask?.estimate || 0)
            ),
            100
        );

    return {
        firstLoadtasksStatisticsData,
        getAllTasksStatsData,
        getTaskStat,
        activeTaskEstimation:
            activeTeamTask && activeTeamTask.estimate
                ? getEstimation(statActiveTask.total)
                : 0,
        activeTaskDailyEstimation:
            activeTeamTask && activeTeamTask.estimate
                ? getEstimation(statActiveTask.today)
                : 0,
        activeTeamTask,
    };
}
