/* eslint-disable react-native/no-inline-styles  */
/* eslint-disable react-native/no-color-literals  */
import { View, StyleSheet, ScrollView } from "react-native"
import React, { RefObject } from "react"
import Accordion from "../../Accordion"
import QuillEditor, { QuillToolbar } from "react-native-cn-quill"
import { useStores } from "../../../models"
import { useAppTheme } from "../../../theme"

const DescriptionBlock = () => {
	const _editor: RefObject<QuillEditor> = React.useRef()

	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	const { colors } = useAppTheme()

	return (
		<Accordion title="Description">
			<View style={{ paddingBottom: 12 }}>
				<QuillEditor
					style={styles.editor}
					ref={_editor}
					initialHtml={task?.description ? task?.description : ""}
					quill={{
						placeholder: "asd",
						modules: {
							toolbar: false,
						},
					}}
				/>
				<ScrollView>
					<View style={{ paddingHorizontal: 12 }}>
						<View
							style={{
								width: "100%",
								borderTopWidth: 1,
								borderTopColor: "#F2F2F2",
								marginBottom: 12,
							}}
						/>
						<QuillToolbar
							editor={_editor}
							styles={{
								toolbar: {
									provider: (provided) => ({
										...provided,
										borderTopWidth: 0,
										borderLeftWidth: 0,
										borderRightWidth: 0,
										borderBottomWidth: 0,

										// backgroundColor: colors.background,
									}),
									root: (provided) => ({
										...provided,
										backgroundColor: colors.background,
										width: "100%",
										// height: "100%",
									}),
								},
								separator: (provided) => ({
									...provided,
									width: "50%",
									borderTopWidth: 5,
								}),
							}}
							options="full"
							theme="light"
						/>
					</View>
				</ScrollView>
			</View>
		</Accordion>
	)
}

export default DescriptionBlock

const styles = StyleSheet.create({
	editor: {
		backgroundColor: "white",
		borderWidth: 0,
		flex: 1,
		marginVertical: 5,
		minHeight: 120,
		padding: 0,
	},
})
