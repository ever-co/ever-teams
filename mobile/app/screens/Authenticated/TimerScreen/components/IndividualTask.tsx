import React from "react"
import { View, StyleSheet, Text } from "react-native"
import { AntDesign, Entypo } from "@expo/vector-icons"

type IIndividualTask = {
  text: string
  status: "Completed" | "Unassigned" | "In progress" | "In Review"
}
// <Entypo name="circle" size={24} color="black" />

const IndividualTask = ({ text, status }: IIndividualTask) => {
  return (
    <View>
      <Text>{text}</Text>

      <View>
        <View>
          <AntDesign name="checkcircleo" size={24} color="black" />
          {status}
          <AntDesign name="down" size={24} color="black" />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({})

export default IndividualTask
