import React, { FC } from "react";
import { AntDesign } from "@expo/vector-icons"
import { View, StyleSheet, Text, TouchableOpacity, Image, Dimensions, ViewStyle, TextStyle } from "react-native"
import { useAppTheme } from "../app";
import { typography } from "../theme";

const { width } = Dimensions.get("window")
type TaskLabelProps = {
    label?: string;
    containerStyle?: ViewStyle;
    labelStyle?: TextStyle;
}

const TaskLabel:FC<TaskLabelProps> = ({label, labelStyle, containerStyle}) => {
    const { colors } = useAppTheme();
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.container, containerStyle, { borderColor: colors.border }]}
        >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image source={require("../../assets/images/new/record-blue.png")} />
                <Text 
                style={{ left: 10, color: colors.primary, fontSize: 10, fontFamily: typography.fonts.PlusJakartaSans.semiBold }}
                >{label ? label : "Label"}</Text>
            </View>
            <AntDesign name="down" size={14} color={colors.primary} />
        </TouchableOpacity>
    )
}

export default TaskLabel;

const styles = StyleSheet.create({
    container: {
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderColor: "rgba(0, 0, 0, 0.13)",
        borderWidth: 1,
        borderRadius: 10,
        width: width / 3,
        height: 32,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
    },

})