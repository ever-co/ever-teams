import { LinearGradient } from "expo-linear-gradient"
import { observer } from "mobx-react-lite"
import React, { FC } from "react"
import { View, StyleSheet, TouchableOpacity, Image, ViewStyle, ImageStyle } from "react-native"

import { GLOBAL_STYLE as GS } from "../../assets/ts/styles"
import { useAppTheme } from "../app"
import { useStores } from "../models"
import { useTimer } from "../services/hooks/useTimer"
import { ITeamTask } from "../services/interfaces/ITask"

type TimerButtonProps = {
    task?: ITeamTask;
    containerStyle?: ViewStyle;
    iconStyle?: ImageStyle;
}

const TimerButton: FC<TimerButtonProps> = observer(({containerStyle, iconStyle}) => {
    const { TimerStore: { localTimerStatus } } = useStores();
    const { canRunTimer, startTimer, stopTimer } = useTimer();
    const { colors, dark } = useAppTheme();

    if (dark) {
        return (
            <View>
                {!localTimerStatus.running ? (
                    <>
                        <TouchableOpacity activeOpacity={canRunTimer ? 1 : 0.4} style={[styles.timerBtnInactive, containerStyle, { backgroundColor: "#fff", opacity: canRunTimer ? 1 : 0.4 }]} onPress={() => { canRunTimer ? startTimer() : {} }}>
                            <Image resizeMode="contain" style={[styles.timerIcon, iconStyle]} source={require("../../assets/icons/new/play.png")} />
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity onPress={() => stopTimer()} style={[styles.timerBtnInactive, containerStyle]}>
                        <LinearGradient colors={["#E93CB9", "#6A71E7"]} style={[styles.timerBtnInactive, containerStyle]}>
                            <Image resizeMode="contain" style={[styles.timerIcon, iconStyle]} source={require("../../assets/icons/new/stop.png")} />
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View >
        )
    }

    return (
        <View>
            {!localTimerStatus.running ? (
                <>
                    <TouchableOpacity activeOpacity={canRunTimer ? 1 : 0.4} style={[styles.timerBtnInactive, containerStyle, { backgroundColor: "#fff", opacity: canRunTimer ? 1 : 0.4 }]} onPress={() => { canRunTimer ? startTimer() : {} }}>
                        <Image resizeMode="contain" style={[styles.timerIcon,iconStyle]} source={require("../../assets/icons/new/play.png")} />
                    </TouchableOpacity>
                </>
            ) : (
                <TouchableOpacity onPress={() => stopTimer()} style={[styles.timerBtnInactive, containerStyle]}>
                    <Image resizeMode="contain" style={[styles.timerIcon, iconStyle]} source={require("../../assets/icons/new/stop.png")} />
                </TouchableOpacity>
            )}
        </View >
    )
})

export default TimerButton;

const styles = StyleSheet.create({
    timerIcon: {
        width: 24,
        height: 24
    },
    timerBtnInactive: {
        width: 60,
        height: 60,
        backgroundColor: "#3826A6",
        borderRadius: 30,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 15,
        borderWidth: 1,
        borderColor: "rgba(0, 0, 0, 0.1)",
        ...GS.shadow
    }
})