import React, { FC, useRef, useState } from "react"
import { TextInput, View, StyleSheet, NativeSyntheticEvent, TextInputKeyPressEventData } from "react-native"
import { colors, typography } from "../theme"

interface IInput {
  onChange: (code: string) => void
}

export const CodeInput: FC<IInput> = ({ onChange }) => {
  const inputsRef = useRef<TextInput[] | null[]>([]);
  const [active, setActive] = useState<number>(0);
  const [inviteCode, setInviteCode] = useState([])
  const inputs = [0, 1, 2, 3, 4, 5]

  const onKeyPress = ({ nativeEvent }:
    NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (nativeEvent.key === "Backspace") {
      if (active !== 0) {
        inputsRef.current[active - 1]?.focus();
        return setActive(active - 1);
      }
    } else {
      inputsRef.current[active + 1]?.focus();
      return setActive(active + 1);
    }
    return null;
  };

  const onChangeCode = (inputCode, inputIndex) => {
    const codes = inviteCode;
    codes[inputIndex] = inputCode
    setInviteCode(codes)
    onChange(codes.join(""))
  }

  return (
    <View style={styles.container}>
      {inputs.map((i) => (
        <TextInput
          key={i}
          maxLength={1}
          keyboardType="numeric"
          style={[styles.inputStyle, { borderColor: active === i ? colors.primary : "rgba(0, 0, 0, 0.1)" }]}
          onKeyPress={onKeyPress}
          autoFocus={active === i}
          ref={(r) => {
            inputsRef.current[i] = r;
          }}
          onChangeText={(num) => onChangeCode(num, i)}
        />
      ))}
    </View>
  );

}
type InputProps = {
  onKeyPress: () => unknown;
  onFocus:()=>unknown
  active: number;
  inputsRef: any,
  index: number

}
const Input: FC<InputProps> = ({ onKeyPress, active, inputsRef, index }) => (
  <View style={styles.container}>
    <TextInput
      maxLength={1}
      keyboardType="numeric"
      style={styles.inputStyle}
      onKeyPress={onKeyPress}
      onFocus={onKeyPress}
      autoFocus={active === index}
      ref={(r) => {
        inputsRef.current[index] = r;
      }} />
  </View>
)

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    marginTop:32
  },
  inputStyle: {
    width: 39,
    height: 53,
    backgroundColor:"#fff",
    textAlign: "center",
    fontSize: 16,
    color:colors.primary,
    fontFamily:typography.primary.semiBold,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    marginHorizontal: 4,
    borderRadius: 10
  },
})
