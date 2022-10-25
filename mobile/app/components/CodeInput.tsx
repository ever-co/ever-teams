import React from "react"
import { TextInput, View } from "react-native"
import { colors } from "../theme"

interface inputType {
  index: number
  item: string
}

export const CodeInput = () => {
  let inputs = [1, 2, 3, 4, 5, 6]
  return (
    <View style={{ flexDirection: "row", marginBottom:10 }}>
      {inputs.map((item) => (
        <View
          key={item}
          style={{
            width: "13%",
            height: 35,
            display: "flex",
            borderRadius: 5,
            justifyContent: "center",
            marginHorizontal: 5,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <TextInput
            placeholder="1"
            style={{
              width: "100%",
              height: "96%",
              textAlign: "center",
              backgroundColor: colors.palette.neutral200,
            }}
          />
        </View>
      ))}
    </View>
  )
}
