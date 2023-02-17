import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useAppTheme } from "../../../../app";
import { translate } from "../../../../i18n";
import { ITaskLabelCreate, ITaskLabelItem } from "../../../../services/interfaces/ITaskLabel";
import { typography } from "../../../../theme";
import ColorDropDown from "./ColorDropDown";
import IconDropDown from "./IconDropdown";

const TaskLabelForm = (
    {
        isEdit,
        onDismiss,
        item,
        onCreateLabel,
        onUpdateLabel }
        :
        {
            isEdit: boolean,
            onDismiss: () => unknown,
            item?: ITaskLabelItem;
            onUpdateLabel: (id: string, data: ITaskLabelCreate) => unknown
            onCreateLabel: (data: ITaskLabelCreate) => unknown
        }
) => {
    const { colors, dark } = useAppTheme();
    const [labelName, setLabelName] = useState<string>(null)
    const [labelColor, setLabelColor] = useState<string>(null)
    const [labelIcon, setLabelIcon] = useState<string>(null)

    useEffect(() => {
        if (isEdit) {
            setLabelName(item.value)
            setLabelColor(item.color)
            setLabelIcon(item.icon)
        } else {
            setLabelName(null)
            setLabelColor(null)
            setLabelIcon(null)
        }
    }, [item, isEdit])


    const handleSubmit = async () => {

        if (labelName.trim().length <= 0 || labelColor.trim().length <= 0) {
            return
        }

        if (isEdit) {
            await onUpdateLabel(item?.id, {
                icon: null,
                color: labelColor,
                name: labelName
            })
        } else {
            await onCreateLabel({
                icon: null,
                color: labelColor,
                name: labelName
            })
        }
        setLabelColor(null)
        setLabelName(null)
        setLabelIcon(null)
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
                placeholder={translate("settingScreen.labelScreen.labelNamePlaceholder")}
                defaultValue={labelName}
                onChangeText={(text) => setLabelName(text)}
            />

            <IconDropDown icon={labelIcon} setIcon={setLabelIcon} />

            <ColorDropDown color={labelColor} setColor={setLabelColor} />

            <View style={styles.wrapButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => onDismiss()}>
                    <Text style={styles.cancelTxt}>{translate("settingScreen.labelScreen.cancelButtonText")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ ...styles.createBtn, backgroundColor: dark ? "#6755C9" : "#3826A6", opacity: !labelColor || !labelName ? 0.2 : 1 }}
                    onPress={() => !labelColor || !labelName ? {} : handleSubmit()}>
                    <Text style={styles.createTxt}>{isEdit ? translate("settingScreen.labelScreen.updateButtonText") : translate("settingScreen.labelScreen.createButtonText")}</Text>
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

export default TaskLabelForm;