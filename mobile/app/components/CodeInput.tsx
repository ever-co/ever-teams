import React from "react"
import { TextInput, View, StyleSheet } from "react-native"
import { colors } from "../theme"

interface inputType {
  index: number
  item: string
}

export const CodeInput = () => {
  let inputs = [1, 2, 3, 4, 5, 6]
  return (
    <View style={{ flexDirection: "row", marginBottom: 10 }}>
      <Input />
      <Input />
      <Input />
      <Input />
      <Input />
      <Input />
    </View>
  )
}

const Input = () => (
  <View style={styles.container}>
    <TextInput placeholder="1" maxLength={1} keyboardType="numeric" style={styles.inputStyle} />
  </View>
)

const styles = StyleSheet.create({
  container: {
    width: "13%",
    height: 35,
    display: "flex",
    borderRadius: 5,
    justifyContent: "center",
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputStyle: {
    width: "100%",
    height: "96%",
    textAlign: "center",
    backgroundColor: colors.palette.neutral200,
  },
})
