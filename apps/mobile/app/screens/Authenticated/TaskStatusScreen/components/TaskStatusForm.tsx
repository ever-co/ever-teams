/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from "react"
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native"
import { translate } from "../../../../i18n"
import { ITaskStatusCreate, ITaskStatusItem } from "../../../../services/interfaces/ITaskStatus"
import { typography, useAppTheme } from "../../../../theme"
import ColorPickerModal from "../../../../components/ColorPickerModal"
import { Badge } from "react-native-paper"
import { formatName } from "../../../../helpers/name-format"
import IconModal from "../../../../components/IconModal"
import { SvgUri } from "react-native-svg"
import { IIcon } from "../../../../services/interfaces/IIcon"

const TaskStatusForm = ({
	isEdit,
	onDismiss,
	item,
	onCreateStatus,
	onUpdateStatus,
}: {
	isEdit: boolean
	onDismiss: () => unknown
	item?: ITaskStatusItem
	onUpdateStatus: (id: string, data: ITaskStatusCreate) => unknown
	onCreateStatus: (data: ITaskStatusCreate) => unknown
}) => {
	const { colors, dark } = useAppTheme()
	const [statusName, setStatusName] = useState<string>(null)
	const [statusColor, setStatusColor] = useState<string>(null)
	const [statusIcon, setStatusIcon] = useState<string>(null)
	const [colorModalVisible, setColorModalVisible] = useState<boolean>(false)
	const [iconModalVisible, setIconModalVisible] = useState<boolean>(false)
	const [allIcons, setAllIcons] = useState<IIcon[]>([])

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
		if (statusName.trim().length <= 0 || statusColor.trim().length <= 0) {
			return
		}

		if (isEdit) {
			await onUpdateStatus(item?.id, {
				icon: statusIcon,
				color: statusColor,
				name: statusName,
			})
		} else {
			await onCreateStatus({
				icon: statusIcon,
				color: statusColor,
				name: statusName,
			})
		}
		setStatusColor(null)
		setStatusName(null)
		setStatusIcon(null)
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
				setIcon={setStatusIcon}
				setAllIcons={setAllIcons}
			/>
			<ColorPickerModal
				visible={colorModalVisible}
				onDismiss={onDismissModal}
				setColor={setStatusColor}
			/>
			<Text style={{ ...styles.formTitle, color: colors.primary }}>
				{translate("settingScreen.statusScreen.createNewStatusText")}
			</Text>
			<TextInput
				style={{ ...styles.statusNameInput, color: colors.primary }}
				placeholderTextColor={"#7B8089"}
				placeholder={translate("settingScreen.statusScreen.statusNamePlaceholder")}
				defaultValue={formatName(statusName)}
				onChangeText={(text) => setStatusName(text)}
			/>

			{/* Icon Modal button */}
			<TouchableOpacity style={styles.colorModalButton} onPress={() => setIconModalVisible(true)}>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<SvgUri
						width={20}
						height={20}
						uri={allIcons?.find((icon) => icon.path === statusIcon)?.fullUrl}
					/>
					<Text
						style={{
							marginLeft: 10,
							color: colors.primary,
							textTransform: "capitalize",
						}}
					>
						{allIcons?.find((icon) => icon.path === statusIcon)?.title?.replace("-", " ") ||
							translate("settingScreen.priorityScreen.priorityIconPlaceholder")}
					</Text>
				</View>
			</TouchableOpacity>

			{/* Color Picker button */}
			<TouchableOpacity style={styles.colorModalButton} onPress={() => setColorModalVisible(true)}>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<Badge size={24} style={{ backgroundColor: statusColor || "#D9D9D9" }} />
					<Text
						style={{
							marginLeft: 10,
							color: colors.primary,
						}}
					>
						{statusColor?.toUpperCase() ||
							translate("settingScreen.statusScreen.statusColorPlaceholder")}
					</Text>
				</View>
			</TouchableOpacity>

			<View style={styles.wrapButtons}>
				<TouchableOpacity style={styles.cancelBtn} onPress={() => onDismiss()}>
					<Text style={styles.cancelTxt}>
						{translate("settingScreen.statusScreen.cancelButtonText")}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={{
						...styles.createBtn,
						backgroundColor: dark ? "#6755C9" : "#3826A6",
						opacity: !statusColor || !statusName ? 0.2 : 1,
					}}
					onPress={() => (!statusColor || !statusName ? {} : handleSubmit())}
				>
					<Text style={styles.createTxt}>
						{isEdit
							? translate("settingScreen.statusScreen.updateButtonText")
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

export default TaskStatusForm
