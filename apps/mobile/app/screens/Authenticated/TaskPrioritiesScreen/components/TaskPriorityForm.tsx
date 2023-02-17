import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useAppTheme } from "../../../../app";
import { translate } from "../../../../i18n";
import { ITaskPriorityCreate, ITaskPriorityItem } from "../../../../services/interfaces/ITaskPriority";
import { typography } from "../../../../theme";
import ColorDropDown from "./ColorDropDown";
import IconDropDown from "./IconDropDown";


const TaskPriorityForm = (
    {
        isEdit,
        onDismiss,
        item,
        onCreatePriority,
        onUpdatePriority }
        :
        {
            isEdit: boolean,
            onDismiss: () => unknown,
            item?: ITaskPriorityItem;
            onUpdatePriority: (id: string, data: ITaskPriorityCreate) => unknown
            onCreatePriority: (data: ITaskPriorityCreate) => unknown
        }
) => {
    const { colors, dark } = useAppTheme();
    const [priorityName, setPriorityName] = useState<string>(null)
    const [priorityColor, setPriorityColor] = useState<string>(null)
    const [priorityIcon, setPriorityIcon] = useState<string>(null)

    useEffect(() => {
        if (isEdit) {
            setPriorityName(item.value)
            setPriorityColor(item.color)
            setPriorityIcon(item.icon)
        } else {
            setPriorityName(null)
            setPriorityColor(null)
            setPriorityIcon(null)
        }
    }, [item, isEdit])


    const handleSubmit = async () => {

        if (priorityName.trim().length <= 0 || priorityColor.trim().length <= 0) {
            return
        }

        if (isEdit) {
            await onUpdatePriority(item?.id, {
                icon: null,
                color: priorityColor,
                name: priorityName
            })
        } else {
            await onCreatePriority({
                icon: null,
                color: priorityColor,
                name: priorityName
            })
        }
        setPriorityColor(null)
        setPriorityName(null)
        setPriorityIcon(null)
        onDismiss()
    }

    return (
        <View
            style={{
                backgroundColor: colors.background,
                paddingHorizontal: 25,
                paddingTop: 26,
                paddingBottom: 40,
                height: 452
            }}
        >
            <Text style={{ ...styles.formTitle, color: colors.primary }}>{translate("settingScreen.priorityScreen.createNewPriorityText")}</Text>
            <TextInput
                style={{ ...styles.statusNameInput, color: colors.primary }}
                placeholderTextColor={"#7B8089"}
                placeholder={translate("settingScreen.priorityScreen.priorityNamePlaceholder")}
                defaultValue={priorityName}
                onChangeText={(text) => setPriorityName(text)}
            />

            <IconDropDown icon={priorityIcon} setIcon={setPriorityIcon} />

            <ColorDropDown color={priorityColor} setColor={setPriorityColor} />

            <View style={styles.wrapButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => onDismiss()}>
                    <Text style={styles.cancelTxt}>{translate("settingScreen.priorityScreen.cancelButtonText")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ ...styles.createBtn, backgroundColor: dark ? "#6755C9" : "#3826A6", opacity: !priorityColor || !priorityName ? 0.2 : 1 }}
                    onPress={() => !priorityColor || !priorityName ? {} : handleSubmit()}>
                    <Text style={styles.createTxt}>{isEdit ? translate("settingScreen.priorityScreen.updateButtonText") : translate("settingScreen.statusScreen.createButtonText")}</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    statusNameInput: {
        width: "100%",
        height: 57,
        borderRadius: 12,
        borderColor: "#DCE4E8",
        borderWidth: 1,
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
        marginTop: 40
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

export default TaskPriorityForm;