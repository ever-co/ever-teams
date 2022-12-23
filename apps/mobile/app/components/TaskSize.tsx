import React from "react";
import { View, StyleSheet, Text, TouchableOpacity, Image, Dimensions } from "react-native"
import { typography } from "../theme";
const {width, height}=Dimensions.get("window")
const TaskSize = () => {
    return (
        <View style={{}}>
            <TouchableOpacity
                activeOpacity={0.7}
                style={styles.container}
            >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image source={require("../../assets/images/new/record.png")} />
                    <Text style={styles.text}>Sizes</Text>
                </View>
                <Image source={require("../../assets/icons/caretDown.png")} />
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
        width: width/3,
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