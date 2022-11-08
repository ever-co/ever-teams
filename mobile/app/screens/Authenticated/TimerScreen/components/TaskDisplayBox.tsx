import React from "react"
import { View, StyleSheet, TextInput, Text } from "react-native"
import { FontAwesome } from "@expo/vector-icons"
import { Entypo } from "@expo/vector-icons"

type ITasDisplayBox = {
  text: string
  openTask: boolean
}

const TaskDisplayBox = ({ text, openTask }: ITasDisplayBox) => {
  return (
    <View style={styles.container}>
      {openTask ? (
        <FontAwesome name="circle" size={12} color="#28D581" />
      ) : (
        <Entypo name="check" size={12} color="#ACB3BB" />
      )}

      <Text style={openTask ? styles.openTask : styles.closedTask}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#F0ECFD",
    width: 90,
    height: 35,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "space-around",
    marginRight: 10,
  },
  openTask: {
    fontWeight: "bold",
    color: "#1B005D",
  },
  closedTask: {
    color: "#ACB3BB",
  },
})

export default TaskDisplayBox
