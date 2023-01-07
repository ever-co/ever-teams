import React from "react"
import { View, StyleSheet, TextInput, Text } from "react-native"
import { FontAwesome, AntDesign } from "@expo/vector-icons"
import { Entypo } from "@expo/vector-icons"
import { typography } from "../../../../theme"
import { useAppTheme } from "../../../../app"

type ITasDisplayBox = {
  count: number
  openTask: boolean
  selected: boolean
}

const TaskDisplayBox = ({ count, openTask, selected }: ITasDisplayBox) => {
  const {colors}=useAppTheme();
  return (
    <View style={[styles.container,{borderColor:colors.border, backgroundColor:colors.background}]}>
      {openTask ? (
        <>
          <FontAwesome name="circle" size={18} color="#9BD9B4" />
          <Text 
          style={[styles.filterText,selected ?{color:colors.secondary, fontWeight:"bold"}:{color:colors.tertiary}]}>{`${count} Open`}</Text>
        </>
      ) : (
        <>
        <AntDesign name="checkcircleo" size={18} color="#BEBCC8" />
          <Text 
          style={[styles.filterText,selected ?{color:colors.secondary, fontWeight:"bold"}:{color:colors.tertiary}]}>{`${count} Closed`}</Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingLeft: 10,
    width: 110,
    height: 26,
    borderWidth: 1,
    borderRadius: 38,
    alignItems: "center",
  },
  filterText: {
    fontSize: 11,
    left: 8,
    fontFamily: typography.fonts.PlusJakartaSans.semiBold
  }
})

export default TaskDisplayBox
