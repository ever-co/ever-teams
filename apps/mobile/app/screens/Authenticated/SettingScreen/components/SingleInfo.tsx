import React, { FC, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Switch } from "react-native"
import { useStores } from "../../../../models";
import { AntDesign } from "@expo/vector-icons"
import { colors, typography } from "../../../../theme";
import { Toggle } from "../../../../components/Toggle";
import { translate } from "../../../../i18n";

interface Props {
    title: string;
    value: string;
    onPress?: () => unknown
}
const SingleInfo: FC<Props> = ({ title, value, onPress }) => {
    const [isEnabled, setIsEnabled] = useState(true);
    const toggleSwitch = () => setIsEnabled(previousState => !previousState);

    return (
        <View style={styles.container}>
            <View style={styles.wrapperInfo}>
                <Text style={styles.infoTitle}>{title}</Text>
                <Text style={styles.infoText}>{value}</Text>
            </View>
            {title === translate("settingScreen.personalSection.timeZone") &&
                <TouchableOpacity style={styles.detectWrapper} >
                    <Text style={[styles.infoTitle, { fontSize: 12 }]}>Detect</Text>
                </TouchableOpacity>
            }
            {title === translate("settingScreen.teamSection.timeTracking") ? (

                <Toggle
                    inputInnerStyle={{ backgroundColor: "#DBD3FA" }}
                    inputDetailStyle={{ backgroundColor: "#3826A6" }}
                    onPress={() => toggleSwitch()}
                    variant="switch"
                    value={isEnabled}
                />
            ) : (
                <>
                    {title !== translate("settingScreen.personalSection.themes") ?
                        (
                            <TouchableOpacity onPress={() => onPress()}>
                                <AntDesign name="right" size={24} color="#938FA4" />
                            </TouchableOpacity>
                        )
                        : (
                            <TouchableOpacity style={styles.toggle}>
                                <Image source={require("../../../../../assets/icons/new/toogle-light.png")} />
                            </TouchableOpacity>
                        )
                    }
                </>
            )}

        </View>
    )
}
export default SingleInfo;

const styles = StyleSheet.create({
    container: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 32
    },
    wrapperInfo: {
        maxWidth: "90%"
    },
    infoTitle: {
        fontSize: 16,
        fontFamily: typography.primary.semiBold,
        color: colors.primary,
    },
    infoText: {
        fontSize: 14,
        fontFamily: typography.primary.medium,
        color: "#938FA4",
        marginTop: 10
    },
    detectWrapper: {
        paddingVertical: 8,
        paddingHorizontal: 13,
        backgroundColor: "#E6E6E9",
        borderRadius: 8
    },
    toggle: {
        top: -10,
        height: 40,
        right: -10
    }
})