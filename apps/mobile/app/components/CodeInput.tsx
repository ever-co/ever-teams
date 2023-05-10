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
import { colors, typography } from "../theme"

interface IInput {
	onChange: (code: string) => void
	editable: boolean
	length?: number
	defaultValue?: string
}

export const CodeInput: FC<IInput> = (props) => {
	const { onChange, editable, length = 6, defaultValue } = props

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
			if (!isNaN(nativeEvent.key)) {
				inputsRef.current[active + 1]?.focus()
				return setActive(active + 1)
			}
		}
		return null
	}

	const onChangeCode = (inputCode, inputIndex) => {
		if (!isNaN(inputCode)) {
			const codes = inviteCode
			codes[inputIndex] = inputCode
			setInviteCode(codes)
			onChange(codes.join(""))
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
				keyboardType="numeric"
				style={[
					styles.inputStyle,
					editable ? { borderColor: active === i ? colors.primary : "rgba(0, 0, 0, 0.1)" } : null,
				]}
				onKeyPress={onKeyPress}
				autoFocus={active === i}
				editable={editable}
				ref={(r) => {
					inputsRef.current[i] = r
				}}
				onChangeText={(num) => onChangeCode(num, i)}
			/>,
		)
	}
	return <View style={styles.container}>{inputs}</View>
}

type InputProps = {
	onKeyPress: () => unknown
	onFocus: () => unknown
	active: number
	inputsRef: any
	index: number
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
