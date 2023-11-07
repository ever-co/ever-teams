/* eslint-disable camelcase */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import {
	View,
	Text,
	Modal,
	TouchableWithoutFeedback,
	Animated,
	ViewStyle,
	StyleSheet,
	TouchableOpacity,
} from "react-native"
import React from "react"
import { BlurView } from "expo-blur"
import { Feather, AntDesign } from "@expo/vector-icons"
import { useAppTheme } from "../../../../theme"
import { OT_Member } from "../../../../services/interfaces/IOrganizationTeam"

interface IChangeRoleModal {
	onDismiss: () => void
	visible: boolean
	member: OT_Member
}

const roles = [
	{ name: "Member", color: "#D4EFDF" },
	{ name: "MANAGER", color: "#008080" },
]

const ChangeRoleModal: React.FC<IChangeRoleModal> = ({ onDismiss, visible, member }) => {
	const { colors } = useAppTheme()

	return (
		<ModalPopUp onDismiss={onDismiss} visible={visible}>
			<View style={[styles.container, { backgroundColor: colors.background2 }]}>
				{roles.map((role, index) => (
					<TouchableOpacity key={index}>
						<View
							style={[
								styles.roleContainer,
								{
									backgroundColor: role.color,
								},
							]}
						>
							<Text>{role.name}</Text>
							{member?.role?.name.toLowerCase() === role.name.toLowerCase() ||
							(!member?.role?.name && role.name === "Member") ? (
								<AntDesign name="checkcircle" size={24} color="#27AE60" />
							) : (
								<Feather name="circle" size={24} color="#FFFFFF" />
							)}
						</View>
					</TouchableOpacity>
				))}
			</View>
		</ModalPopUp>
	)
}

export default ChangeRoleModal

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
			<BlurView
				intensity={15}
				tint="dark"
				style={{
					position: "absolute",
					width: "100%",
					height: "100%",
				}}
			/>
			<TouchableWithoutFeedback onPress={onDismiss}>
				<View style={$modalBackGround}>
					<Animated.View style={{ transform: [{ scale: scaleValue }] }}>
						{children}
					</Animated.View>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	)
}

const $modalBackGround: ViewStyle = {
	flex: 1,
	justifyContent: "center",
}

const styles = StyleSheet.create({
	container: {
		alignSelf: "center",
		backgroundColor: "#fff",
		borderRadius: 20,
		gap: 10,
		paddingHorizontal: 6,
		paddingVertical: 16,
		width: "60%",
	},
	roleContainer: {
		alignItems: "center",
		borderColor: "rgba(0,0,0,0.13)",
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		padding: 10,
	},
})
