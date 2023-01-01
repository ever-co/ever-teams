import React from "react";
import { StyleSheet, View, Text } from "react-native"
import { secondsToTime } from "../helpers/date";
import { pad } from "../helpers/number";
import { useTimer } from "../services/hooks/useTimer";
import { typography } from "../theme/typography";

const WorkedOnTaskHours = (isAuthUser: boolean) => {
    const { timerStatus} = useTimer();
    const { h, m } = secondsToTime(timerStatus?.duration || 0);
    if (!isAuthUser) {
        return (
            <View style={{ justifyContent: "center", alignItems: "center" }}>
                <Text style={styles.timeHeading}>Worked time</Text>
                <Text style={styles.timeNumber}>00 h:00 m</Text>
            </View>
        )
    }
    return (
        <View style={{ justifyContent: "center", alignItems: "center" }}>
            <Text style={styles.timeHeading}>Worked time</Text>
            <Text style={styles.timeNumber}>{pad(h)} h:{pad(m)} m</Text>
        </View>
    )
}
const styles = StyleSheet.create({
    timeHeading: {
        color: "#7E7991",
        fontSize: 10,
        fontFamily: typography.fonts.PlusJakartaSans.medium
    },
    timeNumber: {
        color: "#282048",
        fontSize: 14,
        fontFamily: typography.fonts.PlusJakartaSans.semiBold
    },
})
export default WorkedOnTaskHours;