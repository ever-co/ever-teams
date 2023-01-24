import React, { FC } from "react";
import { AntDesign } from "@expo/vector-icons"
import { View, StyleSheet, Text, TouchableOpacity, Image, Dimensions, ViewStyle, TextStyle } from "react-native"
import { useAppTheme } from "../app";
import { typography } from "../theme";

const { width, height } = Dimensions.get("window")
type TaskSizesProps = {
    sizeLabel?: string;
    containerStyle?: ViewStyle;
    labelStyle?: TextStyle;
}
const TaskSize:FC<TaskSizesProps> = ({containerStyle, labelStyle, sizeLabel}) => {
    const { colors } = useAppTheme();
    return (
            <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.container, containerStyle, { borderColor: colors.border }]}
            >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image source={require("../../assets/images/new/record.png")} />
                    <Text style={[styles.text, { color: colors.tertiary }]}>{sizeLabel ? sizeLabel : "Sizes"}</Text>
                </View>
                <AntDesign name="down" size={14} color={colors.primary} />
            </TouchableOpacity>
    )
}

export default TaskSize;

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
    text: {
        left: 10,
        fontSize: 10,
        fontFamily: typography.fonts.PlusJakartaSans.semiBold
    }

})