import React, { useEffect, useState } from "react";
import { AntDesign } from "@expo/vector-icons"
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import TimezonePopup from "./TimezonePopup";
import { IUser } from "../../../../services/interfaces/IUserData";
import { translate } from "../../../../i18n";
import { limitTextCharaters } from "../../../../helpers/sub-text";
import { typography } from "../../../../theme";
import { useAppTheme } from "../../../../app";


const UserTimezone = (
    {
        onDismiss,
        user,
        onUpdateTimezone,
    }
        :
        {
            onDismiss: () => unknown,
            user: IUser;
            onUpdateTimezone: (userBody: IUser) => unknown;
        }
) => {
    const { colors, dark } = useAppTheme();
    const [userTimeZone, setUserTimeZone] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [timezoneModal, setTimezoneModal]=useState(false)


    useEffect(() => {
        if (user) {
            setUserTimeZone(user?.timeZone)
        }
    }, [user])

    useEffect(() => {
        setUserTimeZone(user?.timeZone)
    }, [user?.timeZone])


    const handleSubmit = async () => {
        if (!userTimeZone) {
            return
        }

        setIsLoading(true)
        await onUpdateTimezone({
            ...user,
            timeZone: userTimeZone
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
                height: 274,
                zIndex: 100
            }}
        >
            <TimezonePopup
                visible={timezoneModal}
                onDismiss={() => setTimezoneModal(false)}
                onTimezoneSelect={(e) => {
                    setUserTimeZone(e)
                }}
            />
            <View style={{ flex: 2 }}>
                <Text style={{ ...styles.formTitle, color: colors.primary }}>{translate("settingScreen.changeTimezone.mainTitle")}</Text>
                <TouchableOpacity style={styles.field} onPress={() =>setTimezoneModal(true) }>
                    <Text style={{ ...styles.text, color: colors.primary }}>{limitTextCharaters({ text: userTimeZone, numChars: 17 })}</Text>
                    <AntDesign name="down" size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <View style={styles.wrapButtons}>
                <TouchableOpacity style={styles.cancelBtn}
                    onPress={() => {
                        setUserTimeZone(user?.timeZone)
                        onDismiss()
                    }
                    }>
                    <Text style={styles.cancelTxt}>{translate("common.cancel")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        ...styles.createBtn,
                        backgroundColor: dark ? "#6755C9" : "#3826A6",
                        opacity: isLoading || !userTimeZone ? 0.5 : 1
                    }}
                    onPress={() => isLoading || !userTimeZone ? {} : handleSubmit()}>
                    {isLoading ?
                        <ActivityIndicator style={{ position: "absolute", left: 10 }} size={"small"} color={"#fff"} /> : null}
                    <Text style={styles.createTxt}>{translate("common.save")}</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    field: {
        width: "100%",
        height: 57,
        flexDirection: "row",
        paddingHorizontal: 20,
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#DCE4E8",
        marginTop: 16,
        borderRadius: 12,
        zIndex: 1000
    },
    text: {
        fontSize: 16,
        fontFamily: typography.primary.medium
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
        flex: 1,
        zIndex: 100
    },
    cancelBtn: {
        width: "48%",
        height: 57,
        backgroundColor: "#E6E6E9",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
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

export default UserTimezone;