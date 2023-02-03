import { observer } from "mobx-react-lite"
import React from "react"
import { View, StyleSheet, Text, ViewStyle, TextStyle } from "react-native"
import { secondsToTime } from "../helpers/date"
import { pad } from "../helpers/number"
import { useStores } from "../models"
import { useTaskStatistics } from "../services/hooks/features/useTaskStatics"
import { ITeamTask } from "../services/interfaces/ITask"
import { typography } from "../theme/typography"

const WorkedOnTask = observer(({ isAuthUser, title, containerStyle, memberTask, totalTimeText }: { isAuthUser: boolean, title: string, memberTask: ITeamTask, containerStyle: ViewStyle, totalTimeText: TextStyle }) => {
    const { getTaskStat} =
        useTaskStatistics();

    const { TaskStore: { tasksStatisticsState, activeTaskId, statActiveTask } } = useStores()
    const activeTaskTotalStat = statActiveTask?.total || 0;
    const activeTaskDailyStat = statActiveTask?.today || 0;

    if (isAuthUser && activeTaskId===memberTask?.id) {
        const { h, m } = secondsToTime(activeTaskTotalStat?.duration || 0);
        const { h: dh, m: dm } = secondsToTime(activeTaskDailyStat?.duration || 0);
        return (
            <View style={containerStyle}>
                <Text style={styles.totalTimeTitle}>{title} : </Text>
                <Text style={totalTimeText}>{pad(h)} h:{pad(m)} m</Text>
            </View>
        )
    }

    const { taskDailyStat, taskTotalStat } = getTaskStat(memberTask);

    const { h, m } = secondsToTime(taskTotalStat?.duration || 0);
    const { h: dh, m: dm } = secondsToTime(taskDailyStat?.duration || 0);

    return (
        <View style={containerStyle}>
            <Text style={styles.totalTimeTitle}>{title} : </Text>
            <Text style={totalTimeText}>{pad(h)} h:{pad(m)} m</Text>
        </View>
    )

})

const styles = StyleSheet.create({
    wrapTotalTime: {
        flexDirection: "row"
    },
    totalTimeTitle: {
        color: "#7E7991",
        fontSize: 10,
        fontFamily: typography.secondary.medium
    },
    totalTimeTxt: {
        fontFamily: typography.primary.semiBold,
        fontSize: 12,
        color: "#282048"
    },
})
export default WorkedOnTask;
