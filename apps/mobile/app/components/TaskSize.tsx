import React from "react";
import { AntDesign } from "@expo/vector-icons"
import { View, StyleSheet, Text, TouchableOpacity, Image, Dimensions } from "react-native"
import { useAppTheme } from "../app";
import { typography } from "../theme";

const { width, height } = Dimensions.get("window")
const TaskSize = () => {
    const { colors } = useAppTheme();
    return (
        <View style={{}}>
            <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.container, { borderColor: colors.border }]}
            >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image source={require("../../assets/images/new/record.png")} />
                    <Text style={[styles.text, { color: colors.tertiary }]}>Sizes</Text>
                </View>
                <AntDesign name="down" size={20} color={colors.primary} />
            </TouchableOpacity>
        </View>
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