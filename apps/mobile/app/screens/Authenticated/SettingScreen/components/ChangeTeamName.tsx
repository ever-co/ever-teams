import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { useAppTheme } from "../../../../app";
import { translate } from "../../../../i18n";
import { useStores } from "../../../../models";
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization";
import { IUser } from "../../../../services/interfaces/IUserData";
import { typography } from "../../../../theme";

const ChangeTeamName = observer((
    { onDismiss }: { onDismiss: () => unknown }
) => {
    const { colors, dark } = useAppTheme();
    const { teamStore: { activeTeam } } = useStores()
    const { onUpdateOrganizationTeam, isTeamManager } = useOrganizationTeam()
    const [teamName, setTeamName] = useState("")
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(false)


    useEffect(() => {
        if (activeTeam) {
            setTeamName(activeTeam.name)
        }
        setError(null)
    }, [activeTeam, onDismiss])


    const onChangeTeamName = (text: string) => {
        if (text.length < 3) {
            setError("Must have at least 3 characters")
        } else {
            setError(null)
        }
        setTeamName(text)
    }

    const handleSubmit = async () => {
        if (!isTeamManager) {
            setError("Only team managers can change team name")
            return
        }

        if (teamName.length === 0) {
            setError("Team Name can't be empty")
            return
        }

        if (teamName.length < 3) {
            setError("Must have at least 3 characters")
            return
        }
        if (teamName !== activeTeam.name) {
            setIsLoading(true)
            await onUpdateOrganizationTeam({
                id: activeTeam.id,
                data: {
                    ...activeTeam,
                    name: teamName
                }
            })
            setIsLoading(false)
        }
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
            <View style={{ flex: 1 }}>
                <Text
                    style={{
                        ...styles.formTitle,
                        color: colors.primary
                    }}
                >
                    {translate("settingScreen.teamSection.changeTeamName.mainTitle")}
                </Text>

                <TextInput
                    style={{
                        ...styles.styleInput,
                        color: colors.primary,
                        borderColor: "#DCE4E8",
                        ...{ backgroundColor: !isTeamManager ? dark ? "#292C33" : "#EDF1F3" : colors.background }
                    }}
                    placeholderTextColor={"#7B8089"}
                    placeholder={translate("settingScreen.teamSection.changeTeamName.inputPlaceholder")}
                    value={teamName}
                    editable={!isLoading && isTeamManager}
                    autoComplete={"off"}
                    autoFocus={false}
                    autoCorrect={false}
                    autoCapitalize={"none"}
                    onChangeText={(text) => onChangeTeamName(text)}
                />

                {error ?
                    <Text style={{ fontFamily: typography.primary.medium, fontSize: 12, color: "red", marginTop: 5 }}>{error}</Text> : null}
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
})

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
        marginTop: 20,
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

export default ChangeTeamName;