import React from "react"
import { StyleSheet, Text, TouchableOpacity } from "react-native"

type IDeletePopUp = {
	onCloseTask: any
	setShowDel: (val: boolean) => void
	setEditMode: (val: boolean) => void
}

const DeletePopUp = ({ onCloseTask, setShowDel, setEditMode }: IDeletePopUp) => {
	return (
		<TouchableOpacity activeOpacity={0.7} style={styles.container}>
			<TouchableOpacity
				activeOpacity={0.7}
				onPress={() => {
					onCloseTask()
					setShowDel(false)
					setEditMode(false)
				}}
			>
				<Text style={{ fontWeight: "bold", color: "#1B005D", fontSize: 10 }}>Confirm</Text>
			</TouchableOpacity>
			<TouchableOpacity
				activeOpacity={0.7}
				style={{ marginTop: 5 }}
				onPress={() => {
					setShowDel(false)
				}}
			>
				<Text style={{ color: "#1B005D", fontSize: 10 }}>Cancel</Text>
			</TouchableOpacity>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	container: {
		alignItems: "flex-start",
		backgroundColor: "#fff",
		borderRadius: 5,
		elevation: 5,
		justifyContent: "center",
		paddingLeft: 5,
		position: "absolute",
		right: 10,
		shadowColor: "#1B005D",
		shadowOffset: { width: 5, height: 5 },
		shadowOpacity: 0.3,
		shadowRadius: 5,
		top: 11,
		width: 50,
		zIndex: 100000000000,
	},
})

export default DeletePopUp
