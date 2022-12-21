import React from "react";
import { View, StyleSheet, Text, TouchableOpacity, Image } from "react-native"
import { typography } from "../theme";

const TaskPriorities = () => {
    return (
        <View style={{}}>
            <TouchableOpacity
                activeOpacity={0.7}
                style={styles.container}
            >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image source={require("../../assets/images/new/record.png")} />
                    <Text style={styles.text}>Priorities</Text>
                </View>
                <Image source={require("../../assets/icons/caretDown.png")} />
            </TouchableOpacity>
        </View>
    )
}

export default TaskPriorities;

const styles = StyleSheet.create({
    container: {
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderColor: "rgba(0, 0, 0, 0.13)",
        borderWidth:1,
        borderRadius: 10,
        width: 136,
        height: 32,
        flexDirection:"row",
        alignItems:"center",
        justifyContent: "space-between"
    },
    text:{
        left:10, 
        color:"#B1AEBC", 
        fontSize:10,
        fontFamily:typography.fonts.PlusJakartaSans.semiBold
    }
    
})