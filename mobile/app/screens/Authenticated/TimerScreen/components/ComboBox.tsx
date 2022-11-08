import React from "react"
import { View, StyleSheet, TextInput, Text } from "react-native"
import TaskDisplayBox from "./TaskDisplayBox"

const ComboBox = () => {
  return (
    <View style={styles.mainContainer}>
      <View style={{ flexDirection: "row" }}>
        <TaskDisplayBox text="32 Open" openTask />
        <TaskDisplayBox text="25 Closed" openTask={false} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    borderColor: "#1B005D0D",
    borderWidth: 2,
    marginHorizontal: 5,
    shadowColor: "#1B005D",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
})

export default ComboBox
