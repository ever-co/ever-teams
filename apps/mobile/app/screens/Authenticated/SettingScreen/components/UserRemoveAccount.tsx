import { View, Text, Image, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native'
import React, { useCallback } from 'react'
import { useOrganizationTeam } from '../../../../services/hooks/useOrganization';
import { useUser } from '../../../../services/hooks/features/useUser';
import { translate } from '../../../../i18n';
import { typography } from '../../../../theme';
import { useAppTheme } from '../../../../app';


const UserRemoveAccount = (
    {
        onDismiss,
        userId,
        actionType
    }: {
        onDismiss: () => unknown,
        userId: string;
        actionType: "Delete" | "Remove"
    }) => {
    const { colors, dark } = useAppTheme()
    const { removeUserFromAllTeams } = useOrganizationTeam();
    const { deleteUser } = useUser();

    const onSubmit = useCallback(async () => {
        if (actionType === "Remove") {
            const data = await removeUserFromAllTeams(userId)
            onDismiss()
            return
        }

        const data = await deleteUser(userId)
        onDismiss()
    }, [userId])

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
                <Text style={{ ...styles.title, color: colors.primary }}>Are you sure ?</Text>
                <Text style={styles.warningMessage}>{actionType === "Delete" ? translate("settingScreen.personalSection.deleteAccountHint") : translate("settingScreen.personalSection.removeAccountHint")}</Text>
                <TouchableOpacity style={styles.button} onPress={() => onSubmit()}>
                    <Text style={styles.buttonText}>Remove Everywhere</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

export default UserRemoveAccount;

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