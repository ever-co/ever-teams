/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from "react"
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native"
import { translate } from "../../../../i18n"
import { ITaskLabelCreate, ITaskLabelItem } from "../../../../services/interfaces/ITaskLabel"
import { typography, useAppTheme } from "../../../../theme"
import ColorPickerModal from "../../../../components/color-picker-modal"
import { Badge } from "react-native-paper"
import { formatName } from "../../../../helpers/name-format"
import IconModal from "../../../../components/icon-modal"
import { IIcon } from "../../../../services/interfaces/IIcon"
import { SvgUri } from "react-native-svg"

// Create a flexible type that can handle both scenarios
type UpdateLabelParam = ITaskLabelItem | (Partial<ITaskLabelItem> & { id: string });

const TaskLabelForm = ({
	isEdit,
	onDismiss,
	item,
	onCreateLabel,
	onUpdateLabel,
	error,
	onErrorDismiss,
}: {
	isEdit: boolean
	onDismiss: () => unknown
	item?: ITaskLabelItem
	onUpdateLabel: (labelData: UpdateLabelParam) => unknown
	onCreateLabel: (data: ITaskLabelCreate) => unknown
	error?: string | null
	onErrorDismiss?: () => void
}) => {
	const { colors, dark } = useAppTheme()
	const [labelName, setLabelName] = useState<string>(null)
	const [labelColor, setLabelColor] = useState<string>(null)
	const [labelIcon, setLabelIcon] = useState<string>(null)
	const [colorModalVisible, setColorModalVisible] = useState<boolean>(false)
	const [iconModalVisible, setIconModalVisible] = useState<boolean>(false)
	const [allIcons, setAllIcons] = useState<IIcon[]>([])

	useEffect(() => {
		if (isEdit && item) {
			setLabelName(item.name)
			setLabelColor(item.color)
			setLabelIcon(item.icon)
		} else {
			setLabelName(null)
			setLabelColor(null)
			setLabelIcon(null)
		}
	}, [item, isEdit])

	const handleSubmit = async () => {
		if (!labelName?.trim() || !labelColor?.trim()) {
			return
		}

		if (isEdit && item) {
			await onUpdateLabel({
				id: item.id,
				icon: labelIcon,
				color: labelColor,
				name: labelName,
				// Keep the original values for fields we're not changing
				// This preserves compatibility with ITaskLabelItem
				...item,
			})
		} else {
			await onCreateLabel({
				icon: labelIcon,
				color: labelColor,
				name: labelName,
			})
		}
		setLabelColor(null)
		setLabelName(null)
		setLabelIcon(null)
		onDismiss()
	}

	const onDismissModal = () => {
		setColorModalVisible(false)
		setIconModalVisible(false)
	}

	// Display error message if error exists
	const renderError = () => {
		if (!error) return null;

		return (
			<View style={styles.errorContainer}>
				<Text style={styles.errorText}>{error}</Text>
				{onErrorDismiss && (
					<TouchableOpacity onPress={onErrorDismiss}>
						<Text style={styles.dismissText}>Dismiss</Text>
					</TouchableOpacity>
				)}
			</View>
		);
	};

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
			{renderError()}

			<IconModal
				visible={iconModalVisible}
				onDismiss={onDismissModal}
				setIcon={setLabelIcon}
				setAllIcons={setAllIcons}
			/>
			<ColorPickerModal
				visible={colorModalVisible}
				onDismiss={onDismissModal}
				setColor={setLabelColor}
				isEdit={isEdit}
				item={item}
			/>

			<Text style={{ ...styles.formTitle, color: colors.primary }}>
				{translate("settingScreen.statusScreen.createNewStatusText")}
			</Text>
			<TextInput
				style={{ ...styles.statusNameInput, color: colors.primary }}
				placeholderTextColor={"#7B8089"}
				placeholder={translate("settingScreen.labelScreen.labelNamePlaceholder")}
				defaultValue={formatName(labelName)}
				onChangeText={(text) => setLabelName(text)}
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
						uri={allIcons?.find((icon) => icon.path === labelIcon)?.fullUrl}
					/>
					<Text
						style={{
							marginLeft: 10,
							color: labelIcon ? colors.primary : "#7B8089",
							textTransform: "capitalize",
						}}
					>
						{allIcons
							?.find((icon) => icon.path === labelIcon)
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
					<Badge size={24} style={{ backgroundColor: labelColor || "#D9D9D9" }} />
					<Text
						style={{
							marginLeft: 10,
							color: labelIcon ? colors.primary : "#7B8089",
						}}
					>
						{labelColor?.toUpperCase() ||
							translate("settingScreen.statusScreen.statusColorPlaceholder")}
					</Text>
				</View>
			</TouchableOpacity>

			<View style={styles.wrapButtons}>
				<TouchableOpacity style={styles.cancelBtn} onPress={() => onDismiss()}>
					<Text style={styles.cancelTxt}>
						{translate("settingScreen.labelScreen.cancelButtonText")}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={{
						...styles.createBtn,
						backgroundColor: dark ? "#6755C9" : "#3826A6",
						opacity: !labelColor || !labelName ? 0.2 : 1,
					}}
					onPress={() => (!labelColor || !labelName ? {} : handleSubmit())}
				>
					<Text style={styles.createTxt}>
						{isEdit
							? translate("settingScreen.labelScreen.updateButtonText")
							: translate("settingScreen.labelScreen.createButtonText")}
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
	errorContainer: {
		backgroundColor: "#ffdddd",
		borderRadius: 8,
		padding: 10,
		marginBottom: 16,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	errorText: {
		color: "#cc0000",
		fontFamily: typography.primary.medium,
		fontSize: 14,
		flex: 1,
	},
	dismissText: {
		color: "#cc0000",
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
		marginLeft: 8,
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

export default TaskLabelForm
