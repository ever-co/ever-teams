import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native"
import { ProgressBar } from "react-native-paper";
import { useStores } from "../models";
import { useTimer } from "../services/hooks/useTimer";
import { colors, typography } from "../theme";

const HeaderTimer = () => {
    const { TimerStore: { timeCounterState, localTimerStatus } } = useStores();
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
                <Text style={styles.timerText}>00:00:00<Text style={styles.smallTxt}>:00</Text></Text>
                <ProgressBar style={{ backgroundColor: "#E9EBF8", height: 4, borderRadius: 3 }} progress={0.7} color={"#27AE60"} />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        width:"100%",
        backgroundColor:"#fff",
        paddingVertical:4,
        alignItems:'center',
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
        width:"50%",
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