import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { TouchableOpacity, Image, StyleSheet } from "react-native"
import { useAppTheme } from "../../../../app"
import { useStores } from "../../../../models";
import { useTimer } from "../../../../services/hooks/useTimer";
import { observer } from "mobx-react-lite";

interface Props {
    isActiveTask: boolean;
}

const TimerButton = observer(() => {
    const { colors, dark } = useAppTheme();
    const { TimerStore: { localTimerStatus } } = useStores();
    const { startTimer, stopTimer } = useTimer();
    if (!dark) {
        return (
            <TouchableOpacity
                style={[styles.timerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => { localTimerStatus.running ? stopTimer() : startTimer() }}>
                <Image
                    resizeMode="contain"
                    style={[styles.timerIcon,]}
                    source={localTimerStatus.running ?
                        require("../../../../../assets/icons/new/stop-blue.png")
                        :
                        require("../../../../../assets/icons/new/play.png")} />
            </TouchableOpacity>
        )
    }

    return (
        <LinearGradient colors={["#E93CB9", "#6A71E7"]} style={[styles.timerBtn]}>
            <TouchableOpacity
                onPress={() => { localTimerStatus.running ? stopTimer() : startTimer() }}>
                <Image
                    resizeMode="contain"
                    style={[styles.timerIcon,]}
                    source={localTimerStatus.running ?
                        require("../../../../../assets/icons/new/stop.png")
                        :
                        require("../../../../../assets/icons/new/play-dark.png")}
                />
            </TouchableOpacity>
        </LinearGradient>
    )
})

const styles = StyleSheet.create({
    timerIcon: {
        width: 21,
        height: 21
    },
    timerBtn: {
        width: 42,
        height: 42,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
        borderWidth: 1,
        borderColor: "rgba(0, 0, 0, 0.4)",
        elevation: 10,
        shadowOffset: { width: 5, height: 10 },
        shadowColor: "rgba(0,0,0,0.16)",
        shadowOpacity: 1,
        shadowRadius: 10
    },
})

export default TimerButton;