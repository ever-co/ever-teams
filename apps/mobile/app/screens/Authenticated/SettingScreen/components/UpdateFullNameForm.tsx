import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { useAppTheme } from "../../../../app";
import { translate } from "../../../../i18n";
import { IUser } from "../../../../services/interfaces/IUserData";
import { typography } from "../../../../theme";

interface IValidation {
    firstname: boolean;
    lastName: boolean;
}
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
    const [isLoading, setIsLoading] = useState(false)
    const [isValid, setIsvalid] = useState<IValidation>({
        firstname: true,
        lastName: true
    })

    useEffect(() => {
        if (user) {
            setUserFirstName(user?.firstName)
            setUserLastName(user?.lastName)
        }
    }, [user])

    const onChangeFistName = (text: string) => {
        if (text.trim().length > 2) {
            setIsvalid({
                ...isValid,
                firstname: true
            })
        } else {
            setIsvalid({
                ...isValid,
                firstname: false
            })
        }
        setUserFirstName(text)
    }

    const onChaneLastName = (text: string) => {
        if (text.trim().length > 2) {
            setIsvalid({
                ...isValid,
                lastName: true
            })
        } else {
            setIsvalid({
                ...isValid,
                lastName: false
            })
        }
        setUserLastName(text)
    }

    const handleSubmit = async () => {
        if (userFirstName.trim().length < 3) {
            setIsvalid({
                ...isValid,
                firstname: false
            })
            return
        }

        if (userLastName.trim().length < 3) {
            setIsvalid({
                ...isValid,
                lastName: false
            })
            return
        }

        if (userFirstName.trim() === user?.firstName && userLastName.trim() === user?.lastName) {
            return
        }

        setIsLoading(true)
        await onUpdateFullName({
            ...user,
            firstName: userFirstName,
            lastName: userLastName,
        })
        setIsLoading(false)
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
                    style={{
                        ...styles.styleInput,
                        color: colors.primary,
                        borderColor: isValid.firstname ? "#DCE4E8" : "red"
                    }}
                    placeholderTextColor={"#7B8089"}
                    placeholder={translate("settingScreen.changeFullName.firstNamePlaceholder")}
                    value={userFirstName}
                    editable={!isLoading}
                    autoComplete={"off"}
                    autoFocus={false}
                    autoCorrect={false}
                    autoCapitalize={"none"}
                    onChangeText={(text) => onChangeFistName(text)}
                />
                {!isValid.firstname ?
                    <Text style={{ fontFamily: typography.primary.medium, fontSize: 12, color: "red", marginTop: 5 }}>Provide a valid last name</Text> : null}

                <TextInput
                    style={{
                        ...styles.styleInput,
                        color: colors.primary,
                        borderColor: isValid.lastName ? "#DCE4E8" : "red"
                    }}
                    placeholderTextColor={"#7B8089"}
                    placeholder={translate("settingScreen.changeFullName.lastNamePlaholder")}
                    value={userLastName}
                    autoCorrect={false}
                    autoComplete={"off"}
                    editable={!isLoading}
                    autoCapitalize={"none"}
                    onChangeText={(text) => onChaneLastName(text)}
                />
                {!isValid.lastName ?
                    <Text style={{ fontFamily: typography.primary.medium, fontSize: 12, color: "red", marginTop: 5 }}>Provide a valid last name</Text> : null}
            </View>

            <View style={styles.wrapButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => onDismiss()}>
                    <Text style={styles.cancelTxt}>{translate("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        ...styles.createBtn,
                        backgroundColor: dark ? "#6755C9" : "#3826A6",
                        opacity: isLoading ? 0.7 : 1
                    }}
                    onPress={() => handleSubmit()}>
                    {isLoading ?
                        <ActivityIndicator style={{ position: "absolute", left: 10 }} size={"small"} color={"#fff"} /> : null}
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
        flexDirection: "row",
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