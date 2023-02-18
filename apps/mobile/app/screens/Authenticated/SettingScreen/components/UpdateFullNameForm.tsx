import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useAppTheme } from "../../../../app";
import { translate } from "../../../../i18n";
import { IUser } from "../../../../services/interfaces/IUserData";
import { typography } from "../../../../theme";


const UpdateFullNameForm = (
    {
        onDismiss,
        user,
        onUpdateFullName }
        :
        {
            onDismiss: () => unknown,
            user: IUser;
            onUpdateFullName: (userBody: IUser) => unknown
        }
) => {
    const { colors, dark } = useAppTheme();
    const [userFirstName, setUserFirstName] = useState("")
    const [userLastName, setUserLastName] = useState("")

    useEffect(() => {
        if (user) {
            setUserFirstName(user?.firstName)
            setUserLastName(user?.lastName)
        }
    }, [user])

    const handleSubmit = async () => {
        await onUpdateFullName({
            ...user,
            firstName: userFirstName,
            lastName: userLastName,
        })
        onDismiss()
    }

    return (
        <View
            style={{
                backgroundColor: colors.background,
                paddingHorizontal: 25,
                paddingTop: 26,
                paddingBottom: 40,
                height: 349,
            }}
        >
            <View style={{ flex: 3 }}>
                <Text style={{ ...styles.formTitle, color: colors.primary }}>{translate("settingScreen.changeFullName.mainTitle")}</Text>
                <TextInput
                    style={{ ...styles.styleInput, color: colors.primary }}
                    placeholderTextColor={"#7B8089"}
                    placeholder={translate("settingScreen.changeFullName.firstNamePlaceholder")}
                    value={userFirstName}
                    autoFocus={false}
                    autoCorrect={false}
                    onChangeText={(text) => setUserFirstName(text)}
                />

                <TextInput
                    style={{ ...styles.styleInput, color: colors.primary }}
                    placeholderTextColor={"#7B8089"}
                    placeholder={translate("settingScreen.changeFullName.lastNamePlaholder")}
                    value={userLastName}
                    onChangeText={(text) => setUserLastName(text)}
                />
            </View>

            <View style={styles.wrapButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => onDismiss()}>
                    <Text style={styles.cancelTxt}>{translate("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ ...styles.createBtn, backgroundColor: dark ? "#6755C9" : "#3826A6" }}
                    onPress={() => handleSubmit()}>
                    <Text style={styles.createTxt}>{translate("common.save")}</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    styleInput: {
        width: "100%",
        height: 57,
        borderRadius: 12,
        borderColor: "#DCE4E8",
        borderWidth: 1,
        fontSize: 16,
        fontFamily: typography.primary.medium,
        paddingHorizontal: 18,
        alignItems: "center",
        marginTop: 16
    },
    formTitle: {
        fontSize: 24,
        fontFamily: typography.primary.semiBold,
        color: "#1A1C1E"
    },
    wrapButtons: {
        flexDirection: "row",
        width: "100%",
        justifyContent: "space-between",
        marginTop: 40,
        flex: 1
    },
    cancelBtn: {
        width: "48%",
        height: 57,
        backgroundColor: "#E6E6E9",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center"
    },
    cancelTxt: {
        fontSize: 18,
        fontFamily: typography.primary.semiBold,
        color: "#1A1C1E",
    },
    createBtn: {
        width: "48%",
        height: 57,
        backgroundColor: "#3826A6",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center"
    },
    createTxt: {
        fontSize: 18,
        fontFamily: typography.primary.semiBold,
        color: "#FFF",
    }
})

export default UpdateFullNameForm;