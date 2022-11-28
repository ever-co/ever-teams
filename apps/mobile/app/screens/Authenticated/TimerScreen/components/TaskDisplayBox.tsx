import React from "react"
import { View, StyleSheet, TextInput, Text } from "react-native"
import { FontAwesome } from "@expo/vector-icons"
import { Entypo } from "@expo/vector-icons"
import { colors } from "../../../../theme"

type ITasDisplayBox = {
  count: number
  openTask: boolean
  selected:boolean
}

const TaskDisplayBox = ({ count, openTask, selected }: ITasDisplayBox) => {
  return (
    <View style={styles.container}>
      {openTask ? (
        <>
          <FontAwesome name="circle" size={12} color="#28D581" />
          <Text style={selected ? styles.activeFilter : styles.inactiveFilter}>{`${count} Open`}</Text>
        </>
      ) : (
        <>
          <Entypo name="check" size={12} color="#ACB3BB" />
          <Text style={selected ? styles.activeFilter : styles.inactiveFilter}>{`${count} Closed`}</Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#F0ECFD",
    width: 80,
    height: 25,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "space-around",
    marginRight: 10,
  },
  inactiveFilter: {
    color: "#ACB3BB",
    fontSize: 11,
  },
  activeFilter:{
    fontWeight: "bold",
    color: "#1B005D",
    fontSize: 11,
  }
})

export default TaskDisplayBox
