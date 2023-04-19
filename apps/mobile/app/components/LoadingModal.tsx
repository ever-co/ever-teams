/* eslint-disable react-native/no-color-literals */
import React from "react"
import { StyleSheet, Text, View, Modal, ActivityIndicator } from "react-native"
import { GLOBAL_STYLE as GS } from "../../assets/ts/styles"
import { translate } from "../i18n"
import { useAppTheme } from "../theme"

const LoadingModal = ({ loading, task }: { loading: boolean; task?: string }) => {
	const { colors } = useAppTheme()
	return (
		<Modal visible={loading} transparent={true} animationType="fade" statusBarTranslucent={true}>
			<View style={styles.centeredView}>
				<View style={{ ...styles.modalView, backgroundColor: colors.background }}>
					<ActivityIndicator size={"large"} color={colors.primary} />
					{task ? (
						<Text style={{ ...styles.modalText, color: colors.primary }}>{task}</Text>
					) : (
						<Text style={{ ...styles.modalText, color: colors.primary }}>
							{translate("common.loading") + "..."}
						</Text>
					)}
				</View>
			</View>
		</Modal>
	)
}

export default LoadingModal

const styles = StyleSheet.create({
	centeredView: {
		alignItems: "center",
		backgroundColor: "#0008",
		flex: 1,
		justifyContent: "center",
	},
	modalText: {
		fontSize: 17,
		marginLeft: 15,
		marginVertical: 15,
		textAlign: "center",
	},
	modalView: {
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 5,
		flexDirection: "row",
		height: 70,
		justifyContent: "center",
		margin: 20,
		width: 200,
		...GS.shadowSm,
	},
})
