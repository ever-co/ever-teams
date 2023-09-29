/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from "react"
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native"
import { translate } from "../../../../i18n"
import { ITaskSizeCreate, ITaskSizeItem } from "../../../../services/interfaces/ITaskSize"
import { typography, useAppTheme } from "../../../../theme"
import IconDropDown from "./IconDropDown"
import ColorPickerModal from "../../../../components/ColorPickerModal"
import { Badge } from "react-native-paper"
import { formatName } from "../../../../helpers/name-format"

const TaskSizeForm = ({
	isEdit,
	onDismiss,
	item,
	onCreateSize,
	onUpdateSize,
}: {
	isEdit: boolean
	onDismiss: () => unknown
	item?: ITaskSizeItem
	onUpdateSize: (id: string, data: ITaskSizeCreate) => unknown
	onCreateSize: (data: ITaskSizeCreate) => unknown
}) => {
	const { colors, dark } = useAppTheme()
	const [sizeName, setSizeName] = useState<string>(null)
	const [sizeColor, setSizeColor] = useState<string>(null)
	const [sizeIcon, setSizeIcon] = useState<string>(null)
	const [modalVisible, setModalVisible] = useState<boolean>(false)

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
				name: sizeName,
			})
		} else {
			await onCreateSize({
				icon: null,
				color: sizeColor,
				name: sizeName,
			})
		}
		setSizeColor(null)
		setSizeName(null)
		setSizeIcon(null)
		onDismiss()
	}

	const onDismissModal = () => {
		setModalVisible(false)
	}

	return (
		<View
			style={{
				backgroundColor: colors.background,
				paddingHorizontal: 25,
				paddingTop: 26,
				paddingBottom: 40,
				height: 452,
			}}
		>
			<ColorPickerModal visible={modalVisible} onDismiss={onDismissModal} setColor={setSizeColor} />

			<Text style={{ ...styles.formTitle, color: colors.primary }}>
				{translate("settingScreen.sizeScreen.createNewSizeText")}
			</Text>
			<TextInput
				style={{ ...styles.statusNameInput, color: colors.primary }}
				placeholderTextColor={"#7B8089"}
				placeholder={translate("settingScreen.sizeScreen.sizeNamePlaceholder")}
				defaultValue={formatName(sizeName)}
				onChangeText={(text) => setSizeName(text)}
			/>

			<IconDropDown icon={sizeIcon} setIcon={setSizeIcon} />

			{/* Color Picker button */}
			<TouchableOpacity style={styles.colorModalButton} onPress={() => setModalVisible(true)}>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<Badge size={24} style={{ backgroundColor: sizeColor || "#D9D9D9" }} />
					<Text
						style={{
							marginLeft: 10,
							color: colors.primary,
						}}
					>
						{sizeColor?.toUpperCase() ||
							translate("settingScreen.statusScreen.statusColorPlaceholder")}
					</Text>
				</View>
			</TouchableOpacity>

			<View style={styles.wrapButtons}>
				<TouchableOpacity style={styles.cancelBtn} onPress={() => onDismiss()}>
					<Text style={styles.cancelTxt}>
						{translate("settingScreen.sizeScreen.cancelButtonText")}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={{
						...styles.createBtn,
						backgroundColor: dark ? "#6755C9" : "#3826A6",
						opacity: !sizeColor || !sizeName ? 0.2 : 1,
					}}
					onPress={() => (!sizeColor || !sizeName ? {} : handleSubmit())}
				>
					<Text style={styles.createTxt}>
						{isEdit
							? translate("settingScreen.sizeScreen.updateButtonText")
							: translate("settingScreen.sizeScreen.createButtonText")}
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	cancelBtn: {
		alignItems: "center",
		backgroundColor: "#E6E6E9",
		borderRadius: 12,
		height: 57,
		justifyContent: "center",
		width: "48%",
	},
	cancelTxt: {
		color: "#1A1C1E",
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
	},
	colorModalButton: {
		alignItems: "center",
		borderColor: "#DCE4E8",
		borderRadius: 12,
		borderWidth: 1,
		flexDirection: "row",
		height: 57,
		justifyContent: "space-between",
		marginTop: 16,
		paddingHorizontal: 18,
		width: "100%",
	},
	createBtn: {
		alignItems: "center",
		backgroundColor: "#3826A6",
		borderRadius: 12,
		height: 57,
		justifyContent: "center",
		width: "48%",
	},
	createTxt: {
		color: "#FFF",
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
	},
	formTitle: {
		color: "#1A1C1E",
		fontFamily: typography.primary.semiBold,
		fontSize: 24,
	},
	statusNameInput: {
		alignItems: "center",
		borderColor: "#DCE4E8",
		borderRadius: 12,
		borderWidth: 1,
		height: 57,
		marginTop: 16,
		paddingHorizontal: 18,
		width: "100%",
	},
	wrapButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 40,
		width: "100%",
	},
})

export default TaskSizeForm
