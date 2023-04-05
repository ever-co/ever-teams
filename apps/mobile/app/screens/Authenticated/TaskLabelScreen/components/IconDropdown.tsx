import React, { useEffect, useState } from "react"
import { AntDesign } from "@expo/vector-icons"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { useAppTheme } from "../../../../theme"
import { IIcon } from "../../../../services/interfaces/IIcon"
import { translate } from "../../../../i18n"

const IconDropDown = ({ icon, setIcon }: { icon: any; setIcon: (icon: any) => unknown }) => {
	const { colors } = useAppTheme()
	const [showDropdown, setShowDropdown] = useState(false)
	const [selectedIcon, setSelectedIcon] = useState<IIcon>(null)
	const [iconsList, setIconsList] = useState<IIcon[]>([])
	useEffect(() => {
		if (icon) {
			setSelectedIcon({
				title: icon,
				icon,
			})
		} else {
			setSelectedIcon(null)
		}
	}, [icon])

	return (
		<View>
			<TouchableOpacity style={styles.container} onPress={() => setShowDropdown(!showDropdown)}>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<Text style={{ ...styles.textIcon, color: colors.primary }}>
						{selectedIcon
							? selectedIcon?.title
							: translate("settingScreen.statusScreen.statusIconPlaceholder")}
					</Text>
				</View>
				{!showDropdown ? (
					<AntDesign name="down" size={24} color="#1A1C1E" />
				) : (
					<AntDesign name="up" size={24} color="#1A1C1E" />
				)}
			</TouchableOpacity>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
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
	dropdownContainer: {
		backgroundColor: "#fff",
		borderRadius: 24,
		bottom: 0,
		height: 200,
		marginBottom: 60,
		paddingHorizontal: 16,
		paddingVertical: 20,
		position: "absolute",
		shadowColor: "rgba(0,0,0,0.1)",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 1,
		shadowRadius: 12,
		width: "100%",
	},
	itemIcon: {
		alignItems: "center",
		borderColor: "rgba(0,0,0,0.13)",
		borderRadius: 12,
		borderWidth: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 10,
		padding: 6,
		width: "100%",
	},
	textIcon: {
		color: "#D9D9D9",
		marginLeft: 10,
	},
})
export default IconDropDown
