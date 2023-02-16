import React,{ useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useAppTheme } from "../../../../app";
import { translate } from "../../../../i18n";
import { ITaskStatusCreate, ITaskStatusItem } from "../../../../services/interfaces/ITaskStatus";
import { typography } from "../../../../theme";
import ColorDropDown from "./ColorDropDown";
import IconDropDown from "./IconDropdown";

 const TaskStatusForm = (
    {
        isEdit,
        onDismiss,
        item,
        onCreateStatus,
        onUpdateStatus }
        :
        {
            isEdit: boolean,
            onDismiss: () => unknown,
            item?: ITaskStatusItem;
            onUpdateStatus: (id: string, data: ITaskStatusCreate) => unknown
            onCreateStatus: (data: ITaskStatusCreate) => unknown
        }
) => {
    const { colors, dark } = useAppTheme();
    const [statusName, setStatusName] = useState<string>(null)
    const [statusColor, setStatusColor] = useState<string>(null)
    const [statusIcon, setStatusIcon] = useState<string>(null)

    useEffect(() => {
        if (isEdit) {
            setStatusName(item.value)
            setStatusColor(item.color)
            setStatusIcon(item.icon)
        } else {
            setStatusName(null)
            setStatusColor(null)
            setStatusIcon(null)
        }
    }, [item, isEdit])


    const handleSubmit = async () => {
        if (isEdit) {
            await onUpdateStatus(item?.id, {
                icon: null,
                color: statusColor,
                name: statusName
            })
        } else {
            await onCreateStatus({
                icon: null,
                color: statusColor,
                name: statusName
            })
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
                height: 452
            }}
        >
            <Text style={{ ...styles.formTitle, color: colors.primary }}>{translate("settingScreen.statusScreen.createNewStatusText")}</Text>
            <TextInput
                style={{ ...styles.statusNameInput, color: colors.primary }}
                placeholderTextColor={"#7B8089"}
                placeholder={translate("settingScreen.statusScreen.statusNamePlaceholder")}
                defaultValue={statusName}
                onChangeText={(text) => setStatusName(text)}
            />

            <IconDropDown icon={statusIcon} setIcon={setStatusIcon} />

            <ColorDropDown color={statusColor} setColor={setStatusColor} />

            <View style={styles.wrapButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => onDismiss()}>
                    <Text style={styles.cancelTxt}>{translate("settingScreen.statusScreen.cancelButtonText")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ ...styles.createBtn, backgroundColor: dark ? "#6755C9" : "#3826A6", opacity: !statusColor || !statusName ? 0.2 : 1 }}
                    onPress={() => !statusColor || !statusName ? {} : handleSubmit()}>
                    <Text style={styles.createTxt}>{isEdit ? translate("settingScreen.statusScreen.updateButtonText") : translate("settingScreen.statusScreen.createButtonText")}</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles=StyleSheet.create({
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

export default TaskStatusForm;