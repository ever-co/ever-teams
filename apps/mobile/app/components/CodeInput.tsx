/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useRef, useState } from "react"
import {
	TextInput,
	View,
	StyleSheet,
	NativeSyntheticEvent,
	TextInputKeyPressEventData,
} from "react-native"
import * as Clipboard from "expo-clipboard"
import { colors, typography, useAppTheme } from "../theme"

interface IInput {
	onChange: (code: string) => void
	editable: boolean
	length?: number
	defaultValue?: string
	loginInput?: boolean
}

export const CodeInput: FC<IInput> = (props) => {
	const { onChange, editable, length = 6, defaultValue, loginInput = false } = props
	const { colors } = useAppTheme()
	const inputsRef = useRef<TextInput[] | null[]>([])
	const [active, setActive] = useState<number>(0)
	const [inviteCode, setInviteCode] = useState([])
	const inputs = []

	const validDefaultValue = defaultValue && defaultValue.length === length

	const onKeyPress = ({ nativeEvent }: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
		if (nativeEvent.key === "Backspace") {
			if (active !== 0) {
				inputsRef.current[active - 1]?.focus()
				setActive(active - 1)
			}
		} else if (nativeEvent.key.match(/^[0-9a-zA-Z]*$/)) {
			if (active < length - 1) {
				// Current input has no value
				if (!inviteCode[active]) {
					const updatedCode = [...inviteCode]
					updatedCode[active] = nativeEvent.key.toUpperCase()
					setInviteCode(updatedCode)
					onChange(updatedCode.join(""))
				}
				// Current input has value
				if (inviteCode[active]) {
					const updatedCode = [...inviteCode]
					updatedCode[active + 1] = nativeEvent.key.toUpperCase()
					setInviteCode(updatedCode)
					onChange(updatedCode.join(""))

					inputsRef.current[active + (active === length - 2 ? 1 : 2)]?.focus()
					setActive(active + (active === length - 2 ? 1 : 2))
					return
				}
				// Move focus to the next input
				inputsRef.current[active + 1]?.focus()
				setActive(active + 1)
			}
		}
	}

	const onChangeCode = (inputCode: string, inputIndex: number) => {
		if (inputCode.match(/^[0-9a-zA-Z]*$/)) {
			// Allow alphanumeric characters
			const codes = [...inviteCode]
			codes[inputIndex] = inputCode
			setInviteCode(codes)
			onChange(codes.join("")) // Call the onChange prop with the updated code
		}
	}

	const onPaste = async () => {
		const pastedText = await Clipboard.getStringAsync()

		const charArray = pastedText.split("")

		if (
			pastedText.length === length &&
			inviteCode.every((currentField) => currentField === "") &&
			charArray.every((currentField) => currentField.match(/^[0-9a-zA-Z]*$/))
		) {
			const updatedCode = charArray.map((char) => {
				return char
			})
			setInviteCode(updatedCode)
			onChange(updatedCode.join(""))

			setActive(length - 1)
			inputsRef.current[length - 1].focus()
			for (let i = 0; i < length; i++) {
				inputsRef.current[i].setNativeProps({ text: updatedCode[i] })
			}
		}
	}

	for (let i = 0; i < length; i++) {
		const dvalue = validDefaultValue ? defaultValue?.charAt(i) : inviteCode[i]
		inputs.push(
			<TextInput
				key={i}
				maxLength={1}
				value={dvalue}
				defaultValue={dvalue}
				keyboardType="default"
				style={[
					styles.inputStyle,
					{
						backgroundColor: loginInput ? "#FFFFFF" : colors.background,
						color: loginInput ? "#282048" : colors.primary,
					},
					editable
						? {
								borderColor:
									active === i
										? loginInput
											? "#282048"
											: colors.primary
										: loginInput
										? "#00000021"
										: colors.border,
						  }
						: null,
				]}
				onKeyPress={onKeyPress}
				autoFocus={active === i}
				editable={editable}
				ref={(r) => {
					inputsRef.current[i] = r
				}}
				onChangeText={(char) => onChangeCode(char, i)}
				onChange={onPaste}
			/>,
		)
	}
	return <View style={styles.container}>{inputs}</View>
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		justifyContent: "center",
		width: "100%",
	},
	inputStyle: {
		backgroundColor: "#fff",
		borderColor: "rgba(0, 0, 0, 0.1)",
		borderRadius: 10,
		borderWidth: 1,
		color: colors.primary,
		fontFamily: typography.primary.semiBold,
		fontSize: 16,
		height: 53,
		marginHorizontal: 4,
		textAlign: "center",
		width: "14.6%",
	},
})
