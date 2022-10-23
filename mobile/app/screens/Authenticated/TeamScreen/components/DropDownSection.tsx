import React from "react"
import { View, Text, StyleSheet } from "react-native"

const DropDownSection = () => {
  return (
    <View style={styles.mainContainer}>
      <Text>Dropdown</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    elevation: 10000,
    position: "absolute",
    top: 50,
    zIndex: 10,
    backgroundColor: "#b33c3c",
    width: "80%",
    height: "400%",
    borderRadius: 10,
  },
})

export default DropDownSection
