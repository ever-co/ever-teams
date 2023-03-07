import React, { FC, useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Switch } from "react-native"
import { useStores } from "../../../../models";
import { AntDesign } from "@expo/vector-icons"
import { typography } from "../../../../theme";
import { Toggle } from "../../../../components/Toggle";
import { translate } from "../../../../i18n";
import { useAppTheme } from "../../../../app";
import { limitTextCharaters } from "../../../../helpers/sub-text";
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization";
import { observer } from "mobx-react-lite";

interface Props {

}
const SwithTimeTracking: FC<Props> = observer(() => {
    const { colors, dark } = useAppTheme();
    const { currentUser, toggleTimeTracking } = useOrganizationTeam()
    const { teamStore: { setIsTrackingEnabled, isTrackingEnabled } } = useStores()
    const [isEnabled, setIsEnabled] = useState(currentUser.isTrackingEnabled);

    const toggleSwitch = useCallback(async () => {
        const { response } = await toggleTimeTracking(currentUser, !isEnabled)
        if (response.ok) {
            setIsEnabled(prev => !prev)
        }
    }, [currentUser, isEnabled]);

    useEffect(() => {
        setIsTrackingEnabled(currentUser?.isTrackingEnabled)
    }, [currentUser])
    return (
        <View style={styles.container}>
            <View style={styles.wrapperInfo}>
                <Text style={[styles.infoTitle, { color: colors.primary }]}>{translate("settingScreen.teamSection.timeTracking")}</Text>
                <Text style={[styles.infoText, { color: colors.tertiary }]}>{limitTextCharaters({ text: translate("settingScreen.teamSection.timeTrackingHint"), numChars: 77 })}</Text>
            </View>
            <Toggle
                inputInnerStyle={{ backgroundColor: "#DBD3FA" }}
                inputDetailStyle={{ backgroundColor: "#3826A6" }}
                onPress={() => toggleSwitch()}
                variant="switch"
                value={isEnabled}
            />
        </View>
    )
})

export default SwithTimeTracking;

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
        borderRadius: 8
    },
    toggle: {
        top: -10,
        height: 40,
        right: -10
    }
})