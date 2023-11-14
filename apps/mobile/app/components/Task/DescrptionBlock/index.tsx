/* eslint-disable react-native/no-inline-styles  */
/* eslint-disable react-native/no-color-literals  */
import { View, StyleSheet, TouchableOpacity, Text, TouchableWithoutFeedback } from "react-native"
import React, { RefObject } from "react"
import Accordion from "../../Accordion"
import QuillEditor, { QuillToolbar } from "react-native-cn-quill"
import { useStores } from "../../../models"
import { useAppTheme } from "../../../theme"
import { translate } from "../../../i18n"
import { SvgXml } from "react-native-svg"
import { copyIcon } from "../../svgs/icons"
import * as Clipboard from "expo-clipboard"
import { showMessage } from "react-native-flash-message"
import { useTeamTasks } from "../../../services/hooks/features/useTeamTasks"
import { useClickOutside } from "react-native-click-outside"

const DescriptionBlock = () => {
	const _editor: RefObject<QuillEditor> = React.useRef()

	const [editorKey, setEditorKey] = React.useState(1)
	const [actionButtonsVisible, setActionButtonsVisible] = React.useState<boolean>(false)
	const [accordionExpanded, setAccordionExpanded] = React.useState<boolean>(true)
	const [htmlValue, setHtmlValue] = React.useState<string>("")

	const { updateDescription } = useTeamTasks()

	const {
		TaskStore: { detailedTask: task },
	} = useStores()

	const { colors, dark } = useAppTheme()

	React.useEffect(() => {
		setEditorKey((prevKey) => prevKey + 1)
	}, [colors, task?.description])

	const handleHtmlChange = (html: string) => {
		setHtmlValue(html)
	}

	function transformHtmlForSlate(html: string) {
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

	const onPressSave = async (): Promise<void> => {
		const formattedValue = transformHtmlForSlate(htmlValue)
		await updateDescription(formattedValue, task).finally(() => {
			_editor.current.blur()
			setActionButtonsVisible(false)
		})
	}

	const copyDescription = async () => {
		const descriptionPlainText = await _editor.current.getText()
		Clipboard.setStringAsync(descriptionPlainText)
		showMessage({
			message: translate("taskDetailsScreen.copyDescription"),
			type: "info",
			backgroundColor: colors.secondary,
		})
	}

	const editorContainerOutsidePressRef = useClickOutside<View>(() => {
		_editor.current?.blur()
		setActionButtonsVisible(false)
	})
	return (
		<Accordion
			setAccordionExpanded={setAccordionExpanded}
			title={translate("taskDetailsScreen.description")}
			headerElement={
				accordionExpanded && (
					<TouchableWithoutFeedback>
						<TouchableOpacity onPress={copyDescription}>
							<SvgXml xml={copyIcon} />
						</TouchableOpacity>
					</TouchableWithoutFeedback>
				)
			}
		>
			<View style={{ paddingBottom: 12 }} ref={editorContainerOutsidePressRef}>
				<QuillEditor
					key={editorKey}
					style={styles.editor}
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
								color: colors.secondary,
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
						theme={
							dark
								? {
										background: "#1c1e21",
										color: "#ebedf0",
										overlay: "rgba(255, 255, 255, .15)",
										size: 28,
								  }
								: {
										background: "#ebedf0",
										color: "#1c1e21",
										overlay: "rgba(55,99,115, .1)",
										size: 28,
								  }
						}
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
								<Text style={{ fontSize: 12 }}>{translate("common.cancel")}</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={onPressSave}
								style={{
									...styles.actionButton,
									backgroundColor: colors.secondary,
								}}
							>
								<Text style={{ color: "white", fontSize: 12 }}>
									{translate("common.save")}
								</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
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
		marginBottom: 10,
		width: "100%",
	},
})
