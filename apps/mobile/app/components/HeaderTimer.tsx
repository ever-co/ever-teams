import { observer } from "mobx-react-lite";
import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native"
import { ProgressBar } from "react-native-paper";
import { pad } from "../helpers/number";
import { useStores } from "../models";
import { useTimer } from "../services/hooks/useTimer";
import { colors, typography } from "../theme";

const HeaderTimer = observer(() => {
    const { TimerStore: { timeCounterState, localTimerStatus }, TaskStore: { activeTask } } = useStores();
    const {
        canRunTimer,
        fomatedTimeCounter: { hours, minutes, seconds, ms_p },
        startTimer,
        stopTimer
    } = useTimer();

    const handleTimer = () => {
        if (!canRunTimer) return;

        if (localTimerStatus.running) {
            stopTimer();
        } else {
            startTimer();
        }
    }

    const getTimePercentage = () => {
        if (activeTask) {
            if (!activeTask.estimate) {
                return 0;
            }
            // convert milliseconds to seconds
            const seconds = timeCounterState / 1000
            return seconds / activeTask.estimate
        } else {
            return 0
        }
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity style={[styles.buttonStyle, { opacity: canRunTimer ? 1 : 0.7 }]} onPress={() => handleTimer()}>
                {localTimerStatus.running ?
                    <Image style={styles.btnImage} source={require("../../assets/icons/new/stop-blue.png")} />
                    :
                    <Image style={styles.btnImage} source={require("../../assets/icons/new/play.png")} />
                }
            </TouchableOpacity>
            <View style={styles.progressContainer}>
                <Text style={styles.timerText}>{pad(hours)}:{pad(minutes)}:{pad(seconds)}<Text style={styles.smallTxt}>:{pad(ms_p)}</Text></Text>
                <ProgressBar style={{ backgroundColor: "#E9EBF8", height: 4, borderRadius: 3 }} progress={getTimePercentage()} color={activeTask && activeTask.estimate > 0 ? "#27AE60" : "#F0F0F0"} />
            </View>
        </View>
    )
})

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        width: "100%",
        backgroundColor: "#fff",
        paddingVertical: 4,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderRadius: 9,
        elevation: 10,
        shadowColor: "rgba(0, 0, 0, 0.1)",
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 1,
    },
    progressContainer: {
        //    backgroundColor:"yellow",
        height: 21,
        width: "50%",
    },
    buttonStyle: {
        paddingHorizontal: 13,
        paddingVertical: 10
    },
    timerText: {
        fontSize: 12,
        fontFamily: typography.secondary.medium,
        color: colors.primary,
        // textAlign:"center",
        // lineHeight:
    },
    btnImage: {

    },
    smallTxt: {
        fontSize: 8
    }
})

export default HeaderTimer;