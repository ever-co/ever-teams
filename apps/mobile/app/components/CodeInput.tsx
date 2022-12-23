import React, { FC, useRef, useState } from "react"
import { TextInput, View, StyleSheet, NativeSyntheticEvent, TextInputKeyPressEventData } from "react-native"
import { colors } from "../theme"

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
          style={[styles.inputStyle, { borderColor: active === i ? colors.primary : "gray" }]}
          onKeyPress={onKeyPress}
          autoFocus={active === i}
          ref={(r) => {
            inputsRef.current[i] = r;
          }}
          onChangeText={(num) => onChangeCode(num, i)}
        />
      ))}

      {/* 
      <TextInput
        maxLength={1}
        keyboardType="numeric"
        style={styles.inputStyle}
        onKeyPress={onKeyPress}
        autoFocus={active === 1}
        ref={(r) => {
          inputsRef.current[1] = r;
        }}
      />
      <TextInput
        maxLength={1}
        keyboardType="numeric"
        style={styles.inputStyle}
        onKeyPress={onKeyPress}
        autoFocus={active === 2}
        ref={(r) => {
          inputsRef.current[2] = r;
        }}
      />
      <TextInput
        maxLength={1}
        keyboardType="numeric"
        style={styles.inputStyle}
        onKeyPress={onKeyPress}
        autoFocus={active === 3}
        ref={(r) => {
          inputsRef.current[3] = r;
        }}
      />
      <TextInput
        maxLength={1}
        keyboardType="numeric"
        style={styles.inputStyle}
        onKeyPress={onKeyPress}
        autoFocus={active === 4}
        ref={(r) => {
          inputsRef.current[4] = r;
        }}
      />
      <TextInput
        maxLength={1}
        keyboardType="numeric"
        style={styles.inputStyle}
        onKeyPress={onKeyPress}
        autoFocus={active === 5}
        ref={(r) => {
          inputsRef.current[5] = r;
        }}
      /> */}
    </View>
  );

}
type InputProps = {
  onKeyPress: () => unknown;
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
  },
  inputStyle: {
    width: 50,
    height: 50,
    textAlign: "center",
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    margin: 2,
    borderRadius: 5
  },
})
