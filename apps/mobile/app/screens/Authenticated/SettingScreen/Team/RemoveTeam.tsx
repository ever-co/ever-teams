import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native'
import { useOrganizationTeam } from '../../../../services/hooks/useOrganization';
import { translate } from '../../../../i18n';
import { typography } from '../../../../theme';
import { useAppTheme } from '../../../../app';
import { useStores } from '../../../../models';
import { observer } from 'mobx-react-lite';


const RemoveTeam = observer((
    {
        onDismiss,
    }: {
        onDismiss: () => unknown,
    }) => {
    const { colors, dark } = useAppTheme()
    const { teamStore: { activeTeam } } = useStores()
    const { onRemoveTeam, isTeamManager } = useOrganizationTeam();


    const onRemoveActiveTeam = async () => {

        if (!isTeamManager) {
            return
        }

        await onRemoveTeam(activeTeam.id)
        onDismiss()
    }

    return (
        <View
            style={styles.container}>
            <TouchableWithoutFeedback onPress={() => onDismiss()}>
                <View style={styles.transparentContainer}>
                    <TouchableWithoutFeedback onPress={() => { }}>
                        <View style={{ ...styles.circleFrame, shadowColor: colors.border }}>
                            <Image source={require("../../../../../assets/images/new/user-remove.png")} />
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
            <View style={{ ...styles.mainContainer, backgroundColor: dark ? "#1E2025" : colors.background }}>
                <Text style={{ ...styles.title, color: colors.primary }}>{translate("settingScreen.teamSection.areYouSure")}</Text>
                <Text style={styles.warningMessage}>{translate("settingScreen.teamSection.removeTeamHint")}</Text>
                <TouchableOpacity style={styles.button} onPress={() => onRemoveActiveTeam()}>
                    <Text style={styles.buttonText}>{translate("settingScreen.teamSection.removeTeam")}</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
})

export default RemoveTeam;

const styles = StyleSheet.create({
    container: {
        width: "100%",
    },
    circleFrame: {
        width: 84,
        height: 84,
        borderRadius: 48,
        backgroundColor: "#DA5E5E",
        position: "absolute",
        alignSelf: "center",
        justifyContent: "center",
        alignItems: "center",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 1,
        elevation: 1,
        zIndex: 1000
    },
    transparentContainer: {
        height: "5%",
        zIndex: 1000
    },
    mainContainer: {
        zIndex: 999,
        height: "100%",
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 56,
        paddingHorizontal: 25
    },
    title: {
        width: "100%",
        textAlign: "center",
        fontSize: 24,
        fontFamily: typography.primary.semiBold
    },
    warningMessage: {
        fontSize: 14,
        fontFamily: typography.primary.medium,
        marginTop: 16,
        width: "100%",
        textAlign: "center",
        color: "#6C7278"
    },
    button: {
        backgroundColor: "#DA5E5E",
        width: "100%", height: 57,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 12,
        marginVertical: 40
    },
    buttonText: {
        color: "#fff",
        fontSize: 18,
        fontFamily: typography.primary.semiBold
    }
})