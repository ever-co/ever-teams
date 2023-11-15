/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-unused-styles */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useCallback, useEffect, useState } from "react"
import moment from "moment-timezone"
import {
	View,
	Text,
	ViewStyle,
	Modal,
	StyleSheet,
	Animated,
	Dimensions,
	TouchableWithoutFeedback,
	Pressable,
	FlatList,
	TextInput,
} from "react-native"
import { AntDesign, FontAwesome, EvilIcons } from "@expo/vector-icons"
import _debounce from "lodash/debounce"

// COMPONENTS
import { translate } from "../../../../i18n"
import { typography, useAppTheme } from "../../../../theme"

export interface Props {
	visible: boolean
	onDismiss: () => unknown
	onTimezoneSelect: (s: string) => unknown
	userTimezone: string
}

export interface IFilter {}

const { height } = Dimensions.get("window")
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
			<TouchableWithoutFeedback onPress={() => onDismiss()}>
				<View style={$modalBackGround}>
					<Animated.View style={{ transform: [{ scale: scaleValue }] }}>
						{children}
					</Animated.View>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	)
}

const TimezonePopup: FC<Props> = function FilterPopup({
	visible,
	onDismiss,
	onTimezoneSelect,
	userTimezone,
}) {
	const { colors, dark } = useAppTheme()
	const [timezones, setTimezones] = useState([])
	const [selectedTimezone, setSelectedTimezone] = useState("")
	const [searchText, setSearchText] = useState<string>("")
	const [searchDebouncedText, setSearchDebouncedText] = useState<string>("")

	useEffect(() => {
		const allTimezones = moment.tz.names()
		const timezonesWithUTC = allTimezones.map((item) => {
			const offset = moment.tz(item).format("Z")
			const formattedItem = item.replace(/_/g, " ")
			return { name: formattedItem, offset } // Create an object with name and offset
		})

		timezonesWithUTC.sort((a, b) => {
			if (a.offset < b.offset) {
				return -1
			}
			if (a.offset > b.offset) {
				return 1
			}
			return 0
		})

		const sortedTimezones = timezonesWithUTC.map((item) => `${item.name} (UTC ${item.offset})`)

		setTimezones(sortedTimezones)
	}, [])

	const handleTimezoneSelect = (item: string) => {
		onTimezoneSelect(item)
		setSelectedTimezone(item)
		onDismiss()
	}

	const handleSearchChangeDebounced = (text: string) => {
		setSearchText(text)
		_debounce(() => setSearchDebouncedText(text), 300)()
	}

	return (
		<ModalPopUp visible={visible} onDismiss={onDismiss}>
			<TouchableWithoutFeedback>
				<View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
					<Text style={{ ...styles.mainTitle, color: colors.primary }}>
						{translate("settingScreen.changeTimezone.selectTimezoneTitle")}
					</Text>
					<View
						style={{
							paddingHorizontal: 20,
						}}
					>
						<TextInput
							placeholder="Search Time Zone"
							placeholderTextColor={dark ? "#5a5b5e" : "#00000021"}
							style={[
								styles.textInput,
								{
									borderBottomColor: dark ? "#5a5b5e" : "#00000021",
									borderBottomWidth: 1,
									color: colors.primary,
								},
							]}
							value={searchText}
							onChangeText={(text) => handleSearchChangeDebounced(text)}
						/>
					</View>

					<FlatList
						style={styles.listContainer}
						bounces={false}
						data={timezones.filter((timezone) =>
							timezone.toLowerCase().includes(searchDebouncedText.toLowerCase()),
						)}
						keyExtractor={(item, index) => item.toString()}
						initialNumToRender={7}
						renderItem={({ item }) => (
							<Pressable
								style={{ ...styles.item, borderColor: colors.border }}
								onPress={() => handleTimezoneSelect(item)}
							>
								<Text style={{ ...styles.tzTitle, color: colors.primary }}>
									{item}
								</Text>
								{(selectedTimezone || userTimezone) === item ? (
									<AntDesign name="checkcircle" color={"#27AE60"} size={21.5} />
								) : (
									<FontAwesome
										name="circle-thin"
										size={24}
										color={dark ? "#5a5b5e" : "#00000021"}
									/>
								)}
							</Pressable>
						)}
					/>
				</View>
			</TouchableWithoutFeedback>
		</ModalPopUp>
	)
}

export default TimezonePopup

const $modalBackGround: ViewStyle = {
	flex: 1,
	backgroundColor: "#000000AA",
	justifyContent: "center",
}

const styles = StyleSheet.create({
	buttonText: {
		color: "#FFF",
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
	},
	item: {
		alignItems: "center",
		borderColor: "rgba(0,0,0,0.13)",
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: "row",
		height: 42,
		justifyContent: "space-between",
		marginBottom: 10,
		paddingHorizontal: 16,
		width: "100%",
	},
	listContainer: {
		marginVertical: 16,
		paddingHorizontal: 20,
		width: "100%",
	},
	mainContainer: {
		alignSelf: "center",
		backgroundColor: "yellow",
		borderColor: "#1B005D0D",
		borderRadius: 24,
		borderTopRightRadius: 24,
		borderWidth: 2,
		height: height / 2,
		paddingVertical: 16,
		shadowColor: "#1B005D0D",
		shadowOffset: { width: 10, height: 10 },
		shadowRadius: 10,
		width: "90%",
		zIndex: 1000,
	},
	mainTitle: {
		fontFamily: typography.primary.semiBold,
		fontSize: 24,
		marginBottom: 10,
		paddingHorizontal: 20,
	},
	statusContainer: {
		height: 57,
		paddingHorizontal: 16,
		paddingVertical: 10,
		width: 156,
		zIndex: 1000,
	},
	textInput: { fontSize: 18, marginTop: 10 },
	tzTitle: {
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
	},
	wrapForm: {
		marginTop: 16,
		width: "100%",
		zIndex: 100,
	},
})
