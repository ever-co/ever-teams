/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useEffect, useState } from "react"
import {
	View,
	ViewStyle,
	Modal,
	Animated,
	StyleSheet,
	TouchableOpacity,
	TouchableWithoutFeedback,
	TextInput,
	ScrollView,
} from "react-native"

import { useAppTheme } from "../theme"
import { translate } from "../i18n"
import { generateIconList } from "../helpers/generate-icon"
import { IIcon } from "../services/interfaces/IIcon"
import { SvgUri } from "react-native-svg"

interface IColorPicker {
	visible: boolean
	onDismiss: () => void
	setIcon: React.Dispatch<React.SetStateAction<string>>
	setAllIcons: React.Dispatch<React.SetStateAction<IIcon[]>>
}

const IconModal: FC<IColorPicker> = ({ visible, onDismiss, setIcon, setAllIcons }) => {
	const { colors } = useAppTheme()
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

	const iconList: IIcon[] = [...taskStatusIconList, ...taskSizesIconList, ...taskPrioritiesIconList]

	useEffect(() => {
		setAllIcons(iconList)
		setSearchText("")
	}, [visible])

	return (
		<ModalPopUp visible={visible} onDismiss={onDismiss}>
			<View style={[styles.container, { backgroundColor: colors.background2 }]}>
				<TextInput
					placeholder={translate("settingScreen.priorityScreen.priorityIconPlaceholder")}
					style={styles.textInput}
					value={searchText}
					onChangeText={(text) => setSearchText(text)}
				/>
				<View style={styles.divider} />
				<ScrollView style={{ maxHeight: 220 }}>
					<View style={styles.iconsContainer}>
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
				</ScrollView>
			</View>
		</ModalPopUp>
	)
}

export default IconModal

const ModalPopUp = ({ visible, children, onDismiss }) => {
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
			<TouchableWithoutFeedback onPress={onDismiss}>
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
	container: {
		alignSelf: "center",
		borderRadius: 20,
		height: 300,
		padding: 20,
		width: "90%",
	},
	divider: { backgroundColor: "#b1aebc80", height: 1, marginBottom: 10, width: "100%" },
	iconsContainer: {
		display: "flex",
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 13.5,
	},
	textInput: { fontSize: 18, marginBottom: 10 },
})
