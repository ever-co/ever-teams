import React from "react"
import { View, StyleSheet, Text, TouchableOpacity, Image } from "react-native"
import { colors, typography } from "../../../../theme";

const SettingHeader = (props) => {
    const { navigation } = props;
    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Image source={require("../../../../../assets/icons/new/arrow-left.png")} />
            </TouchableOpacity>
            <Text style={styles.title}>Settings</Text>
            <Image source={require("../../../../../assets/icons/new/info-circle.png")} />
        </View>
    )
}

export default SettingHeader;

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        paddingVertical:20
    },
    title: {
        fontFamily: typography.primary.semiBold,
        fontSize: 16,
        color: colors.primary
    }
})