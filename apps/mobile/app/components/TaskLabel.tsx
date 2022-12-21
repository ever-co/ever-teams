import React from "react";
import { View, StyleSheet, Text, TouchableOpacity, Image } from "react-native"
import { typography } from "../theme";

const TaskLabel = () => {
    return (
        <View style={{ width: "100%" }}>
            <TouchableOpacity
                activeOpacity={0.7}
                style={styles.container}
            >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image source={require("../../assets/images/new/record-blue.png")} />
                    <Text style={{ left: 10, color: "#282048", fontSize: 10, fontFamily:typography.fonts.PlusJakartaSans.semiBold }}>Label</Text>
                </View>
                <Image source={require("../../assets/icons/caretDown.png")} />
            </TouchableOpacity>
        </View>
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
        width: "100%",
        height: 32,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
    },

})