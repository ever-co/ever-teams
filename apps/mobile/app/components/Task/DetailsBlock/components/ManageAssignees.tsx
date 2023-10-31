/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable camelcase */
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
import React, { useState } from "react"
import { useAppTheme } from "../../../../theme"
import { OT_Member } from "../../../../services/interfaces/IOrganizationTeam"
import ProfileInfo from "./ProfileInfo"
import { SvgXml } from "react-native-svg"
import { trashIconLarge } from "../../../svgs/icons"

interface IManageAssignees {
	memberList: OT_Member[]
}

const ManageAssignees: React.FC<IManageAssignees> = ({ memberList }) => {
	const [modalVisible, setModalVisible] = useState<boolean>(false)
	const { colors } = useAppTheme()
	return (
		<>
			<TouchableOpacity
				onPress={() => setModalVisible(true)}
				style={{
					borderRadius: 100,
					borderWidth: 1,
					borderColor: "#E5E7EB",
					paddingHorizontal: 8,
					paddingVertical: 4,
					marginTop: 10,
					justifyContent: "center",
					alignItems: "center",
					width: 140,
				}}
			>
				<Text style={{ fontSize: 12, fontWeight: "600" }}>Manage Assignees</Text>
			</TouchableOpacity>

			<ModalPopUp visible={modalVisible}>
				<View style={[styles.container, { backgroundColor: colors.background }]}>
					{memberList?.map((member, index) => (
						<View key={index} style={styles.memberWrapper}>
							<ProfileInfo
								largerProfileInfo={true}
								profilePicSrc={member?.employee?.user?.imageUrl}
								names={`${member?.employee?.user?.firstName || ""} ${
									member?.employee?.user?.lastName || ""
								}`}
							/>
							<TouchableOpacity>
								<SvgXml xml={trashIconLarge} />
							</TouchableOpacity>
						</View>
					))}
				</View>
			</ModalPopUp>
		</>
	)
}

export default ManageAssignees

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
	backgroundColor: "#000000AA",
	justifyContent: "center",
}

const styles = StyleSheet.create({
	container: {
		alignSelf: "center",
		borderRadius: 20,
		padding: 20,
		width: "70%",
	},
	memberWrapper: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 10,
	},
})
