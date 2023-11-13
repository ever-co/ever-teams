/* eslint-disable react-native/no-inline-styles  */
/* eslint-disable react-native/no-color-literals  */
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from "react-native"
import React, { RefObject } from "react"
import Accordion from "../../Accordion"
import QuillEditor, { QuillToolbar } from "react-native-cn-quill"
import { useStores } from "../../../models"
import { useAppTheme } from "../../../theme"
import { translate } from "../../../i18n"

const DescriptionBlock = () => {
	const _editor: RefObject<QuillEditor> = React.useRef()

	const [editorKey, setEditorKey] = React.useState(1)
	const [actionButtonsVisible, setActionButtonsVisible] = React.useState<boolean>(false)

	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	const { colors, dark } = useAppTheme()

	React.useEffect(() => {
		setEditorKey((prevKey) => prevKey + 1)
	}, [colors, task?.description])

	const handleEditorChange = async () => {
		const currentHtml = await _editor.current?.getText()
		console.log(currentHtml)
	}

	const handleHtmlChange = (event) => {
		console.log("HTML Content:", event)
		console.log("DB Value:", task?.description)
		console.log("Interesting:", transformHtmlForSlate(event))
	}

	function transformHtmlForSlate(html) {
		// Replace <pre> with <p> and the content inside <pre> with <code>,
		// excluding <a> tags from modification
		const modifiedHtml = html
			.replace(
				/<pre class="ql-syntax" spellcheck="false">([\s\S]*?)<\/pre>/g,
				(_, content) => {
					const codeContent = content.replace(/(<a .*?<\/a>)/g, "PLACEHOLDER_FOR_A_TAG")
					return `<p><pre><code>${codeContent}</code></pre></p>`
				},
			)
			.replace(/PLACEHOLDER_FOR_A_TAG/g, (_, content) => content)
			.replace(/class="ql-align-(.*?)"/g, (_, alignmentClass) => {
				return `style="text-align:${alignmentClass}"`
			})

		return modifiedHtml
	}

	const onPressCancel = async (): Promise<void> => {
		await _editor.current
			.setContents("")
			.then(() => _editor.current.dangerouslyPasteHTML(0, task?.description))
			.then(() => _editor.current.blur())
			.finally(() => setTimeout(() => setActionButtonsVisible(false), 100))
	}

	return (
		<Accordion title={translate("taskDetailsScreen.description")}>
			<View style={{ paddingBottom: 12 }}>
				<QuillEditor
					key={editorKey}
					style={styles.editor}
					onEditorChange={handleEditorChange}
					onHtmlChange={(event) => handleHtmlChange(event.html)}
					onTextChange={() => setActionButtonsVisible(true)}
					webview={{ allowsLinkPreview: true }}
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
									}),
									root: (provided) => ({
										...provided,
										backgroundColor: colors.background,
										width: "100%",
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
						{actionButtonsVisible && (
							<View style={styles.actionButtonsWrapper}>
								<TouchableOpacity
									style={{
										...styles.actionButton,
										backgroundColor: "#E7E7EA",
									}}
									onPress={onPressCancel}
								>
									<Text style={{ fontSize: 12 }}>Cancel</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={{
										...styles.actionButton,
										backgroundColor: colors.secondary,
									}}
								>
									<Text style={{ color: "white", fontSize: 12 }}>Save</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
				</ScrollView>
			</View>
		</Accordion>
	)
}

export default DescriptionBlock

const styles = StyleSheet.create({
	actionButton: {
		alignItems: "center",
		borderRadius: 8,
		height: 30,
		justifyContent: "center",
		width: 80,
	},
	actionButtonsWrapper: {
		flexDirection: "row",
		gap: 5,
		justifyContent: "flex-end",
		marginVertical: 5,
	},
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
