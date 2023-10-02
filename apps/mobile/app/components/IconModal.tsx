/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from "react"
import {
	View,
	ViewStyle,
	Modal,
	Animated,
	StyleSheet,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
	FlatList,
	TextInput,
} from "react-native"

import { useAppTheme, typography } from "../theme"
import { translate } from "../i18n"
import { generateIconList } from "../helpers/generate-icon"
import { IIcon } from "../services/interfaces/IIcon"
import { Image, SvgUri } from "react-native-svg"

interface IColorPicker {
	visible: boolean
	onDismiss: () => void
	setIcon: React.Dispatch<React.SetStateAction<string>>
}

const IconModal: FC<IColorPicker> = ({ visible, onDismiss, setIcon }) => {
	const { dark, colors } = useAppTheme()
	const [searchText, setSearchText] = useState<string>("")

	const taskStatusIconList: IIcon[] = generateIconList("task-statuses", [
		"open",
		"in-progress",
		"ready",
		"in-review",
		"blocked",
		"completed",
	])
	const taskSizesIconList: IIcon[] = generateIconList("task-sizes", [
		"x-large",
		// 'large',
		// 'medium',
		// 'small',
		// 'tiny',
	])
	const taskPrioritiesIconList: IIcon[] = generateIconList("task-priorities", [
		"urgent",
		"high",
		"medium",
		"low",
	])

	// console.log(searchText)

	const iconList: IIcon[] = [...taskStatusIconList, ...taskSizesIconList, ...taskPrioritiesIconList]

	return (
		<ModalPopUp visible={visible}>
			<View style={[styles.container, { backgroundColor: colors.background2 }]}>
				<TextInput
					placeholder="Search Icon"
					style={{ fontSize: 18, marginBottom: 10 }}
					value={searchText}
					onChangeText={(text) => setSearchText(text)}
				/>
				<View
					style={{ height: 1, backgroundColor: "#b1aebc80", width: "100%", marginBottom: 10 }}
				/>
				<View
					style={{
						display: "flex",
						flexDirection: "row",
						flexWrap: "wrap",
						gap: 13.5,
					}}
				>
					{iconList
						.filter((item) =>
							item.title.toLowerCase().split("-").join(" ").includes(searchText.toLowerCase()),
						)
						.map((item, idx) => (
							<TouchableOpacity
								style={{ padding: 8 }}
								key={idx}
								onPress={() => {
									setIcon(item.path)
									onDismiss()
								}}
							>
								<SvgUri width={30} height={30} uri={item.fullUrl} />
							</TouchableOpacity>
						))}
				</View>

				{/* <View style={styles.wrapButtons}>
					<TouchableOpacity style={styles.cancelBtn} onPress={() => onDismiss()}>
						<Text style={styles.cancelTxt}>
							{translate("settingScreen.statusScreen.cancelButtonText")}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={{
							...styles.confirmBtn,
							backgroundColor: dark ? "#6755C9" : "#3826A6",
						}}
					>
						<Text style={styles.createTxt}>{translate("common.confirm")}</Text>
					</TouchableOpacity>
				</View> */}
			</View>
		</ModalPopUp>
	)
}

export default IconModal

const ModalPopUp = ({ visible, children }) => {
	const [showModal, setShowModal] = React.useState(visible)
	const scaleValue = React.useRef(new Animated.Value(0)).current

	React.useEffect(() => {
		toggleModal()
	}, [visible])
	const toggleModal = () => {
		if (visible) {
			setShowModal(true)
			Animated.spring(scaleValue, {
				toValue: 1,
				useNativeDriver: true,
			}).start()
		} else {
			setTimeout(() => setShowModal(false), 200)
			Animated.timing(scaleValue, {
				toValue: 0,
				duration: 300,
				useNativeDriver: true,
			}).start()
		}
	}
	return (
		<Modal animationType="fade" transparent visible={showModal}>
			<TouchableWithoutFeedback>
				<View style={$modalBackGround}>
					<Animated.View style={{ transform: [{ scale: scaleValue }] }}>{children}</Animated.View>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	)
}

const $modalBackGround: ViewStyle = {
	flex: 1,
	backgroundColor: "#000000AA",
	justifyContent: "center",
}

const styles = StyleSheet.create({
	// cancelBtn: {
	// 	alignItems: "center",
	// 	backgroundColor: "#E6E6E9",
	// 	borderRadius: 12,
	// 	height: 57,
	// 	justifyContent: "center",
	// 	width: "48%",
	// },
	// cancelTxt: {
	// 	color: "#1A1C1E",
	// 	fontFamily: typography.primary.semiBold,
	// 	fontSize: 18,
	// },
	// confirmBtn: {
	// 	alignItems: "center",
	// 	backgroundColor: "#3826A6",
	// 	borderRadius: 12,
	// 	height: 57,
	// 	justifyContent: "center",
	// 	width: "48%",
	// },
	container: {
		alignSelf: "center",
		borderRadius: 20,
		padding: 20,
		width: "90%",
	},
	// createTxt: {
	// 	color: "#FFF",
	// 	fontFamily: typography.primary.semiBold,
	// 	fontSize: 18,
	// },
	// wrapButtons: {
	// 	flexDirection: "row",
	// 	justifyContent: "space-between",
	// 	marginTop: 20,
	// 	width: "100%",
	// },
})
