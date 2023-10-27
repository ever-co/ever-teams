/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import { View, TextInput, StyleSheet, TouchableOpacity } from "react-native"
import React, { useEffect, useState } from "react"
import { useStores } from "../../../models"
import { useAppTheme } from "../../../theme"
import { SvgXml } from "react-native-svg"
import { closeIconLight, copyIcon, editIcon, tickIconLight } from "../../svgs/icons"

const TaskTitleBlock = () => {
	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	const { dark, colors } = useAppTheme()

	const [title, setTitle] = useState<string>("")
	const [edit, setEdit] = useState<boolean>(false)

	useEffect(() => {
		if (!edit) {
			task && setTitle(task?.title)
		}
	}, [task, edit])

	return (
		<View>
			<View style={{ flexDirection: "row", gap: 5 }}>
				<TextInput
					multiline
					editable={edit}
					style={[
						styles.textInputOutline,
						{
							fontSize: 20,
							fontWeight: "600",
							maxHeight: 150,
							flex: 1,
							color: colors.primary,
							textAlignVertical: "top",
							borderColor: edit ? (dark ? "#464242" : "#e5e7eb") : "transparent",
							borderRadius: 5,
						},
					]}
					onChangeText={(text) => setTitle(text)}
					value={title}
				/>
				{edit ? (
					<View style={{ gap: 5 }}>
						<TouchableOpacity
							onPress={() => setEdit(false)}
							style={{
								padding: 3,
								borderRadius: 5,
								borderWidth: 1,
								borderColor: dark ? "#464242" : "#e5e7eb",
							}}
						>
							<SvgXml xml={tickIconLight} />
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => setEdit(false)}
							style={{
								padding: 3,
								borderRadius: 5,
								borderWidth: 1,
								borderColor: dark ? "#464242" : "#e5e7eb",
							}}
						>
							<SvgXml xml={closeIconLight} />
						</TouchableOpacity>
					</View>
				) : (
					<View style={{ alignItems: "center", justifyContent: "center" }}>
						<TouchableOpacity
							onPress={() => setEdit(true)}
							style={{
								borderRadius: 100,
								padding: 5,
								backgroundColor: "#EDEDED",
								height: 30,
								width: 30,
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<SvgXml xml={editIcon} />
						</TouchableOpacity>
						<TouchableOpacity
							style={{
								height: 30,
								width: 30,
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<SvgXml xml={copyIcon} />
						</TouchableOpacity>
					</View>
				)}
			</View>
		</View>
	)
}

export default TaskTitleBlock

const styles = StyleSheet.create({
	textInputOutline: {
		borderWidth: 1,
	},
})
