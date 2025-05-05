/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from "react"
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native"
import { translate } from "../../../../i18n"
import {
	ITaskPriorityCreate,
	ITaskPriorityItem,
} from "../../../../services/interfaces/ITaskPriority"
import { typography, useAppTheme } from "../../../../theme"
// import IconDropDown from "./IconDropDown"
import ColorPickerModal from "../../../../components/ColorPickerModal"
import { Badge } from "react-native-paper"
import { formatName } from "../../../../helpers/name-format"
import IconModal from "../../../../components/IconModal"
import { IIcon } from "../../../../services/interfaces/IIcon"
import { SvgUri } from "react-native-svg"

const TaskPriorityForm = ({
	isEdit,
	onDismiss,
	item,
	onCreatePriority,
	onUpdatePriority,
}: {
	isEdit: boolean
	onDismiss: () => unknown
	item?: ITaskPriorityItem
	onUpdatePriority: (id: string, data: ITaskPriorityCreate) => unknown
	onCreatePriority: (data: ITaskPriorityCreate) => unknown
}) => {
	const { colors, dark } = useAppTheme()
	const [priorityName, setPriorityName] = useState<string>(null)
	const [priorityColor, setPriorityColor] = useState<string>(null)
	const [priorityIcon, setPriorityIcon] = useState<string>(null)
	const [colorModalVisible, setColorModalVisible] = useState<boolean>(false)
	const [iconModalVisible, setIconModalVisible] = useState<boolean>(false)
	const [allIcons, setAllIcons] = useState<IIcon[]>([])

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
				icon: priorityIcon,
				color: priorityColor,
				name: priorityName,
			})
		} else {
			await onCreatePriority({
				icon: priorityIcon,
				color: priorityColor,
				name: priorityName,
			})
		}
		setPriorityColor(null)
		setPriorityName(null)
		setPriorityIcon(null)
		onDismiss()
	}

	const onDismissModal = () => {
		setColorModalVisible(false)
		setIconModalVisible(false)
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
			<IconModal
				visible={iconModalVisible}
				onDismiss={onDismissModal}
				setIcon={setPriorityIcon}
				setAllIcons={setAllIcons}
			/>
			<ColorPickerModal
				visible={colorModalVisible}
				onDismiss={onDismissModal}
				setColor={setPriorityColor}
				isEdit={isEdit}
				item={item}
			/>
			<Text style={{ ...styles.formTitle, color: colors.primary }}>
				{translate("settingScreen.priorityScreen.createNewPriorityText")}
			</Text>
			<TextInput
				style={{
					...styles.statusNameInput,
					color: colors.primary,
					textTransform: "capitalize",
				}}
				placeholderTextColor={"#7B8089"}
				placeholder={translate("settingScreen.priorityScreen.priorityNamePlaceholder")}
				defaultValue={formatName(priorityName)}
				onChangeText={(text) => setPriorityName(text)}
			/>

			{/* Icon Modal button */}
			<TouchableOpacity
				style={styles.colorModalButton}
				onPress={() => setIconModalVisible(true)}
			>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<SvgUri
						width={20}
						height={20}
						uri={allIcons?.find((icon) => icon.path === priorityIcon)?.fullUrl}
					/>
					<Text
						style={{
							marginLeft: 10,
							color: priorityIcon ? colors.primary : "#7B8089",
							textTransform: "capitalize",
						}}
					>
						{allIcons
							?.find((icon) => icon.path === priorityIcon)
							?.title?.replace("-", " ") ||
							translate("settingScreen.priorityScreen.priorityIconPlaceholder")}
					</Text>
				</View>
			</TouchableOpacity>

			{/* Color Picker button */}
			<TouchableOpacity
				style={styles.colorModalButton}
				onPress={() => setColorModalVisible(true)}
			>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<Badge size={24} style={{ backgroundColor: priorityColor || "#D9D9D9" }} />
					<Text
						style={{
							marginLeft: 10,
							color: priorityIcon ? colors.primary : "#7B8089",
						}}
					>
						{priorityColor?.toUpperCase() ||
							translate("settingScreen.statusScreen.statusColorPlaceholder")}
					</Text>
				</View>
			</TouchableOpacity>
			<View style={styles.wrapButtons}>
				<TouchableOpacity style={styles.cancelBtn} onPress={() => onDismiss()}>
					<Text style={styles.cancelTxt}>
						{translate("settingScreen.priorityScreen.cancelButtonText")}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={{
						...styles.createBtn,
						backgroundColor: dark ? "#6755C9" : "#3826A6",
						opacity: !priorityColor || !priorityName ? 0.2 : 1,
					}}
					onPress={() => (!priorityColor || !priorityName ? {} : handleSubmit())}
				>
					<Text style={styles.createTxt}>
						{isEdit
							? translate("settingScreen.priorityScreen.updateButtonText")
							: translate("settingScreen.statusScreen.createButtonText")}
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

export default TaskPriorityForm
