/* eslint-disable react-native/no-inline-styles  */
/* eslint-disable react-native/no-color-literals  */
import { View, StyleSheet, ScrollView } from "react-native"
import React, { RefObject } from "react"
import Accordion from "../../Accordion"
import QuillEditor, { QuillToolbar } from "react-native-cn-quill"
import { useStores } from "../../../models"
import { useAppTheme } from "../../../theme"
import { translate } from "../../../i18n"

const DescriptionBlock = () => {
	const _editor: RefObject<QuillEditor> = React.useRef()

	const [editorKey, setEditorKey] = React.useState(1)

	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	const { colors, dark } = useAppTheme()

	React.useEffect(() => {
		setEditorKey((prevKey) => prevKey + 1)
	}, [colors])

	return (
		<Accordion title={translate("taskDetailsScreen.description")}>
			<View style={{ paddingBottom: 12 }}>
				<QuillEditor
					key={editorKey}
					style={styles.editor}
					ref={_editor}
					initialHtml={task?.description ? task?.description : ""}
					quill={{
						placeholder: translate("taskDetailsScreen.descriptionBlockPlaceholder"),
						modules: {
							toolbar: false,
						},
					}}
					theme={{
						background: colors.background,
						color: colors.primary,
						placeholder: "#e0e0e0",
					}}
				/>
				<ScrollView>
					<View style={{ paddingHorizontal: 12 }}>
						<View style={styles.horizontalSeparator} />
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
								selection: {
									root: (provided) => ({
										...provided,
										backgroundColor: colors.background,
									}),
								},
							}}
							options={[
								[
									"bold",
									"italic",
									"underline",
									"code",
									"blockquote",

									{ header: "1" },
									{ header: "2" },
									{ list: "ordered" },
									{ list: "bullet" },
									{ align: [] },
								],
							]}
							theme={dark ? "dark" : "light"}
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
		minHeight: 230,
		padding: 0,
	},
	horizontalSeparator: {
		borderTopColor: "#F2F2F2",
		borderTopWidth: 1,
		marginBottom: 12,
		width: "100%",
	},
})
