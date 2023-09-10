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
import { colors, typography, useAppTheme } from "../theme"

interface IInput {
	onChange: (code: string) => void
	editable: boolean
	length?: number
	defaultValue?: string
}

export const CodeInput: FC<IInput> = (props) => {
	const { onChange, editable, length = 6, defaultValue } = props
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
				return setActive(active - 1)
			}
		} else {
			if (nativeEvent.key.match(/^[0-9a-zA-Z]*$/)) {
				if (!inviteCode[active + 1]) {
					const updatedCode = [...inviteCode]
					updatedCode[active + 1] = nativeEvent.key
					setInviteCode(updatedCode)
					onChange(updatedCode.join(""))
				}
				inputsRef.current[active + 1]?.focus()
				return setActive(active + 1)
			}
		}
		return null
	}

	const onChangeCode = (inputCode: string, inputIndex: number) => {
		if (inputCode.match(/^[0-9a-zA-Z]*$/)) {
			// Allow alphanumeric characters
			const codes = inviteCode
			codes[inputIndex] = inputCode
			setInviteCode(codes)
			onChange(inviteCode.join("")) // Call the onChange prop with the updated code
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
					{ backgroundColor: colors.background, color: colors.primary },
					editable ? { borderColor: active === i ? colors.primary : colors.border } : null,
				]}
				onKeyPress={onKeyPress}
				autoFocus={active === i}
				editable={editable}
				ref={(r) => {
					inputsRef.current[i] = r
				}}
				onChangeText={(char) => onChangeCode(char, i)}
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
