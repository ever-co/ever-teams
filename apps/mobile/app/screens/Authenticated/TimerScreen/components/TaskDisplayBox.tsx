import React from "react"
import { View, StyleSheet, TextInput, Text } from "react-native"
import { FontAwesome, AntDesign } from "@expo/vector-icons"
import { Entypo } from "@expo/vector-icons"
import { colors, typography } from "../../../../theme"

type ITasDisplayBox = {
  count: number
  openTask: boolean
  selected: boolean
}

const TaskDisplayBox = ({ count, openTask, selected }: ITasDisplayBox) => {
  return (
    <View style={styles.container}>
      {openTask ? (
        <>
          <FontAwesome name="circle" size={18} color="#D4EFDF" />
          <Text style={selected ? styles.activeFilter : styles.inactiveFilter}>{`${count} Open`}</Text>
        </>
      ) : (
        <>
        <AntDesign name="checkcircleo" size={18} color="#BEBCC8" />
          <Text style={selected ? styles.activeFilter : styles.inactiveFilter}>{`${count} Closed`}</Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    // paddingVertical: ,
    paddingLeft: 10,
    width: 110,
    height: 26,
    borderColor: "rgba(0, 0, 0, 0.1)",
    borderWidth: 1,
    borderRadius: 38,
    alignItems: "center",
  },
  inactiveFilter: {
    color: "#BEBCC8",
    fontSize: 11,
    left: 8,
    fontFamily: typography.fonts.PlusJakartaSans.semiBold
  },
  activeFilter: {
    fontWeight: "bold",
    color: "#1B005D",
    left: 8,
    fontSize: 11,
    fontFamily: typography.fonts.PlusJakartaSans.semiBold
  }
})

export default TaskDisplayBox
