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
	Dimensions,
} from "react-native"
import React, { useEffect, useMemo, useState } from "react"
import { useAppTheme } from "../../../../theme"
import { OT_Member } from "../../../../services/interfaces/IOrganizationTeam"
import ProfileInfo from "./ProfileInfo"
import { SvgXml } from "react-native-svg"
import { trashIconLarge } from "../../../svgs/icons"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import { useTeamMemberCard } from "../../../../services/hooks/features/useTeamMemberCard"
import { ScrollView } from "react-native-gesture-handler"
import { BlurView } from "expo-blur"
import { translate } from "../../../../i18n"

interface IManageAssignees {
	memberList: OT_Member[]
	task: ITeamTask
}

const ManageAssignees: React.FC<IManageAssignees> = ({ memberList, task }) => {
	const [modalVisible, setModalVisible] = useState<boolean>(false)
	const [member, setMember] = useState<OT_Member>()
	const [memberToRemove, setMemberToRemove] = useState<boolean>(false)
	const [memberToAdd, setMemberToAdd] = useState<boolean>(false)

	const { colors } = useAppTheme()
	const memberInfo = useTeamMemberCard(member)
	const { height } = Dimensions.get("window")

	const assignedToTaskMembers = useMemo(
		() =>
			memberList?.filter((member) =>
				member.employee
					? task?.members.map((item) => item.userId).includes(member.employee?.userId)
					: false,
			),
		[memberList, task?.members],
	)

	const unassignedMembers = useMemo(
		() =>
			memberList?.filter((member) =>
				member.employee
					? !task?.members.map((item) => item.userId).includes(member.employee.userId)
					: false,
			),
		[memberList, task?.members],
	)

	useEffect(() => {
		if (task && member && memberToRemove) {
			memberInfo
				.unassignTask(task)
				.then(() => {
					setMember(undefined)
					setMemberToRemove(false)
				})
				.catch(() => {
					setMember(undefined)
					setMemberToRemove(false)
				})
		} else if (task && member && memberToAdd) {
			memberInfo
				.assignTask(task)
				.then(() => {
					setMember(undefined)
					setMemberToAdd(false)
				})
				.catch(() => {
					setMember(undefined)
					setMemberToAdd(false)
				})
		}
	}, [task, member, memberInfo, memberToAdd, memberToRemove])

	return (
		<View>
			<TouchableOpacity onPress={() => setModalVisible(true)} style={styles.button}>
				<Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>
					{translate("taskDetailsScreen.manageAssignees")}
				</Text>
			</TouchableOpacity>

			<ModalPopUp visible={modalVisible} onDismiss={() => setModalVisible(false)}>
				<View
					style={[
						styles.container,
						{ backgroundColor: colors.background, maxHeight: height / 2 },
					]}
				>
					<ScrollView>
						{assignedToTaskMembers?.map((member, index) => (
							<TouchableOpacity
								onPress={() => {
									setMember(member)
									setMemberToRemove(true)
									setModalVisible(false)
								}}
								key={index}
								style={styles.memberWrapper}
							>
								<View pointerEvents="none">
									<ProfileInfo
										largerProfileInfo={true}
										profilePicSrc={member?.employee?.user?.imageUrl}
										names={`${member?.employee?.user?.firstName || ""} ${
											member?.employee?.user?.lastName || ""
										}`}
									/>
								</View>
								<View pointerEvents="none">
									<SvgXml xml={trashIconLarge} />
								</View>
							</TouchableOpacity>
						))}
						{unassignedMembers?.map((member, index) => (
							<TouchableOpacity
								onPress={() => {
									setMember(member)
									setMemberToAdd(true)
									setModalVisible(false)
								}}
								key={index}
								style={styles.memberWrapper}
							>
								<View pointerEvents="none">
									<ProfileInfo
										largerProfileInfo={true}
										profilePicSrc={member?.employee?.user?.imageUrl}
										names={`${member?.employee?.user?.firstName || ""} ${
											member?.employee?.user?.lastName || ""
										}`}
									/>
								</View>
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>
			</ModalPopUp>
		</View>
	)
}

export default ManageAssignees

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
	button: {
		alignItems: "center",
		borderColor: "#E5E7EB",
		borderRadius: 100,
		borderWidth: 1,
		height: 24,
		justifyContent: "center",
		marginVertical: 10,
		paddingHorizontal: 8,
		paddingVertical: 4,
		width: 140,
	},
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
