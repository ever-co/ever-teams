/* eslint-disable react-native/no-inline-styles  */
/* eslint-disable react-native/no-color-literals  */
import { View, StyleSheet, ScrollView } from "react-native"
import React from "react"
import Accordion from "../../Accordion"
import QuillEditor, { QuillToolbar } from "react-native-cn-quill"
import { useStores } from "../../../models"
import { useAppTheme } from "../../../theme"

const DescriptionBlock = () => {
	const _editor = React.useRef()
	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	const { colors } = useAppTheme()

	return (
		<Accordion title="Description">
			<View style={{ paddingHorizontal: 12 }}>
				<QuillEditor
					style={styles.editor}
					ref={_editor}
					initialHtml={
						task?.description
							? task?.description
							: "<p>Quill Editor for react-native</p>"
					}
				/>
				<ScrollView>
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
								}),
								root: (provided) => ({
									...provided,
									backgroundColor: colors.secondary2,
								}),
							},
							separator: (provided) => ({
								...provided,
								display: "none",
							}),
						}}
						options="full"
						theme="light"
					/>
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
