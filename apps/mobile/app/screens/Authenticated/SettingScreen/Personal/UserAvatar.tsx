/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useCallback, useMemo, useState } from "react"
import { Ionicons } from "@expo/vector-icons"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { imgTitle } from "../../../../helpers/img-title"
import { useStores } from "../../../../models"
import { typography, useAppTheme } from "../../../../theme"
import { Avatar } from "react-native-paper"
import { observer } from "mobx-react-lite"
import { useSettings } from "../../../../services/hooks/features/useSettings"
import ConfirmationModal from "../../../../components/ConfirmationModal"
import { translate } from "../../../../i18n"

interface Props {
	buttonLabel: string
	onChange: () => unknown
}

const UserAvatar: FC<Props> = observer(({ buttonLabel, onChange }) => {
	const {
		authenticationStore: { user },
	} = useStores()

	const [openConfirmationModal, setOpenConfirmationModal] = useState<boolean>(false)

	const { updateUserInfo } = useSettings()
	const { colors, dark } = useAppTheme()

	const onDeleteAvatar = useCallback(async () => {
		await updateUserInfo({
			...user,
			imageUrl: null,
			imageId: null,
			image: null,
		})
	}, [])

	const imageUrl = useMemo(
		() => user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl,
		[user?.image?.thumb],
	)

	return (
		<View style={[styles.container, { backgroundColor: colors.background, opacity: 0.9 }]}>
			{imageUrl ? (
				<Avatar.Image size={70} source={{ uri: imageUrl }} />
			) : (
				<Avatar.Text size={70} label={imgTitle(user?.name)} labelStyle={styles.prefix} />
			)}
			<TouchableOpacity
				style={[styles.changeAvatarBtn, { borderColor: colors.secondary }]}
				onPress={() => onChange()}
			>
				<Text style={[styles.changeAvatarTxt, { color: colors.secondary }]}>{buttonLabel}</Text>
			</TouchableOpacity>
			<TouchableOpacity
				style={[styles.deleteContainer, { backgroundColor: dark ? "#3D4756" : "#E6E6E9" }]}
				onPress={() => setOpenConfirmationModal(true)}
			>
				<Ionicons name="trash-outline" size={24} color={colors.primary} />
			</TouchableOpacity>
			<ConfirmationModal
				visible={openConfirmationModal}
				onDismiss={() => setOpenConfirmationModal(false)}
				onConfirm={onDeleteAvatar}
				confirmationText={translate("settingScreen.changeAvatar.avatarDeleteConfirmation")}
			/>
		</View>
	)
})

export default UserAvatar

const styles = StyleSheet.create({
	changeAvatarBtn: {
		alignItems: "center",
		borderColor: "#3826A6",
		borderRadius: 7,
		borderWidth: 2,
		height: 42,
		justifyContent: "center",
		width: 168,
	},
	changeAvatarTxt: {
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
	},
	container: {
		alignItems: "center",
		backgroundColor: "#fff",
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 20,
		width: "100%",
	},
	deleteContainer: {
		alignItems: "center",
		borderRadius: 7,
		justifyContent: "center",
		paddingHorizontal: 16,
		paddingVertical: 11,
	},
	pictureContainer: {
		borderRadius: 40,
		height: 70,
		width: 70,
	},
	prefix: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 24,
		fontWeight: "600",
	},
	teamImage: {
		alignItems: "center",
		backgroundColor: "#C1E0EA",
		borderRadius: 35,
		elevation: 2,
		height: 70,
		justifyContent: "center",
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: 1.5,
		},
		shadowOpacity: 0.18,
		shadowRadius: 1.0,
		width: 70,
	},
})
