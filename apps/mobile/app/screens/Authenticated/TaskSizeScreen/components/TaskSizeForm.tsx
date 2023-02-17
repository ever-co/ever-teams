import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { useAppTheme } from "../../../../app";
import { translate } from "../../../../i18n";
import { ITaskSizeCreate, ITaskSizeItem } from "../../../../services/interfaces/ITaskSize";
import { typography } from "../../../../theme";
import ColorDropDown from "./ColorDropDown";
import IconDropDown from "./IconDropDown";

const TaskSizeForm = (
    {
        isEdit,
        onDismiss,
        item,
        onCreateSize,
        onUpdateSize }
        :
        {
            isEdit: boolean,
            onDismiss: () => unknown,
            item?: ITaskSizeItem;
            onUpdateSize: (id: string, data: ITaskSizeCreate) => unknown
            onCreateSize: (data: ITaskSizeCreate) => unknown
        }
) => {
    const { colors, dark } = useAppTheme();
    const [sizeName, setSizeName] = useState<string>(null)
    const [sizeColor, setSizeColor] = useState<string>(null)
    const [sizeIcon, setSizeIcon] = useState<string>(null)

    useEffect(() => {
        if (isEdit) {
            setSizeName(item.value)
            setSizeColor(item.color)
            setSizeIcon(item.icon)
        } else {
            setSizeName(null)
            setSizeColor(null)
            setSizeIcon(null)
        }
    }, [item, isEdit])


    const handleSubmit = async () => {

        if (sizeName.trim().length <= 0 || sizeColor.trim().length <= 0) {
            return
        }

        if (isEdit) {
            await onUpdateSize(item?.id, {
                icon: null,
                color: sizeColor,
                name: sizeName
            })
        } else {
            await onCreateSize({
                icon: null,
                color: sizeColor,
                name: sizeName
            })
        }
        setSizeColor(null)
        setSizeName(null)
        setSizeIcon(null)
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
            <Text style={{ ...styles.formTitle, color: colors.primary }}>{translate("settingScreen.sizeScreen.createNewSizeText")}</Text>
            <TextInput
                style={{ ...styles.statusNameInput, color: colors.primary }}
                placeholderTextColor={"#7B8089"}
                placeholder={translate("settingScreen.sizeScreen.sizeNamePlaceholder")}
                defaultValue={sizeName}
                onChangeText={(text) => setSizeName(text)}
            />

            <IconDropDown icon={sizeIcon} setIcon={setSizeIcon} />

            <ColorDropDown color={sizeColor} setColor={setSizeColor} />

            <View style={styles.wrapButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => onDismiss()}>
                    <Text style={styles.cancelTxt}>{translate("settingScreen.sizeScreen.cancelButtonText")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{ ...styles.createBtn, backgroundColor: dark ? "#6755C9" : "#3826A6", opacity: !sizeColor || !sizeName ? 0.2 : 1 }}
                    onPress={() => !sizeColor || !sizeName ? {} : handleSubmit()}>
                    <Text style={styles.createTxt}>{isEdit ? translate("settingScreen.sizeScreen.updateButtonText") : translate("settingScreen.sizeScreen.createButtonText")}</Text>
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

export default TaskSizeForm;