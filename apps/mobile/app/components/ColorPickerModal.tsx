/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC } from "react"
import {
	View,
	ViewStyle,
	Modal,
	Animated,
	StyleSheet,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
} from "react-native"
import { useSharedValue } from "react-native-reanimated"
import ColorPicker, {
	Panel1,
	Swatches,
	OpacitySlider,
	HueSlider,
	colorKit,
	PreviewText,
} from "reanimated-color-picker"
import { useAppTheme, typography } from "../theme"
import { translate } from "../i18n"

interface ColorObj {
	hex: string
	hsl: string
	hsla: string
	hsv: string
	hsva: string
	hwb: string
	hwba: string
	rgb: string
	rgba: string
}

interface IColorPicker {
	visible: boolean
	onDismiss: () => void
	setColor: React.Dispatch<React.SetStateAction<string>>
}

const ColorPickerModal: FC<IColorPicker> = ({ visible, onDismiss, setColor }) => {
	const { dark, colors } = useAppTheme()

	const customSwatches = new Array(6).fill("#fff").map(() => colorKit.randomRgbColor().hex())

	const selectedColor = useSharedValue(customSwatches[0])

	const onColorSelect = (color: ColorObj) => {
		selectedColor.value = color.hex
	}

	return (
		<ModalPopUp visible={visible}>
			<View style={[styles.container, { backgroundColor: colors.background2 }]}>
				<ColorPicker
					value={selectedColor.value}
					sliderThickness={25}
					thumbSize={24}
					thumbShape="circle"
					onChange={onColorSelect}
					boundedThumb
				>
					<Panel1 style={styles.panelStyle} />
					<HueSlider style={styles.sliderStyle} />
					<OpacitySlider style={styles.sliderStyle} />
					<Swatches
						style={styles.swatchesContainer}
						swatchStyle={styles.swatchStyle}
						colors={customSwatches}
					/>
					<View style={styles.previewTxtContainer}>
						<PreviewText style={{ color: dark ? "#ffffff" : "#000000", fontSize: 18 }} />
					</View>
				</ColorPicker>
				<View style={styles.wrapButtons}>
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
						onPress={() => {
							setColor(selectedColor.value)
							onDismiss()
						}}
					>
						<Text style={styles.createTxt}>{translate("common.confirm")}</Text>
					</TouchableOpacity>
				</View>
			</View>
		</ModalPopUp>
	)
}

export default ColorPickerModal

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
	confirmBtn: {
		alignItems: "center",
		backgroundColor: "#3826A6",
		borderRadius: 12,
		height: 57,
		justifyContent: "center",
		width: "48%",
	},
	container: {
		alignSelf: "center",
		borderRadius: 20,
		padding: 20,
		width: "90%",
	},
	createTxt: {
		color: "#FFF",
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
	},
	panelStyle: {
		borderRadius: 16,

		elevation: 5,
		// shadowColor: "#000",
		// shadowOffset: {
		// 	width: 0,
		// 	height: 2,
		// },
		// shadowOpacity: 0.25,

		// shadowRadius: 3.84,
	},
	previewTxtContainer: {
		borderColor: "#bebdbe",
		borderTopWidth: 1,
		marginTop: 20,
		paddingTop: 20,
	},
	sliderStyle: {
		borderRadius: 20,
		elevation: 5,

		marginTop: 20,
		// shadowColor: "#000",
		// shadowOffset: {
		// 	width: 0,
		// 	height: 2,
		// },
		// shadowOpacity: 0.25,

		// shadowRadius: 3.84,
	},
	swatchStyle: {
		borderRadius: 20,
		height: 30,
		margin: 0,
		marginBottom: 0,
		marginHorizontal: 0,
		marginVertical: 0,
		width: 30,
	},
	swatchesContainer: {
		alignItems: "center",
		borderColor: "#bebdbe",
		borderTopWidth: 1,
		flexWrap: "nowrap",
		gap: 10,
		marginTop: 20,
		paddingTop: 20,
	},
	wrapButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 20,
		width: "100%",
	},
})
