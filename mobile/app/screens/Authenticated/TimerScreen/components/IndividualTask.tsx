import React from "react"
import { View, StyleSheet, Text } from "react-native"
import { AntDesign, Entypo } from "@expo/vector-icons"
import { MaterialCommunityIcons } from "@expo/vector-icons"

type IIndividualTask = {
  text: string
  status: "Completed" | "Unassigned" | "In progress" | "In Review"
}

const IndividualTask = ({ text, status }: IIndividualTask) => {
  return (
    <View style={styles.container}>
      <Text style={{ color: "#1B005D" }}>{text}</Text>
      <View>
        <View
          style={
            status === "Completed"
              ? styles.completed
              : status === "In Review"
              ? styles.inReview
              : status === "In progress"
              ? styles.inProgress
              : styles.unAssigned
          }
        >
          {status === "Completed" ? (
            <AntDesign name="checkcircleo" size={12} color="#3D9A6D" />
          ) : status === "In Review" ? (
            <AntDesign name="search1" size={12} color="#8F97A1" />
          ) : status === "In progress" ? (
            <MaterialCommunityIcons name="progress-check" size={12} color="#735EA8" />
          ) : (
            <Entypo name="circle" size={12} color="#8B7FAA" />
          )}

          <Text
            style={
              status === "Completed"
                ? styles.textCompleted
                : status === "In Review"
                ? styles.textInReview
                : status === "In progress"
                ? styles.textInProgress
                : styles.textUnAssigned
            }
          >
            {status}
          </Text>
          <AntDesign
            name="down"
            size={12}
            color={
              status === "Completed"
                ? "#3D9A6D"
                : status === "In Review"
                ? "#8F97A1"
                : status === "In progress"
                ? "#735EA8"
                : "#8B7FAA"
            }
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: 10,
  },
  statusDisplay: {
    flexDirection: "row",
  },
  completed: {
    flexDirection: "row",
    backgroundColor: "#D4F7E6",
    width: 120,
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 15,
    height: 25,
  },
  unAssigned: {
    flexDirection: "row",
    backgroundColor: "#F2F4F6",
    width: 120,
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 15,
    height: 25,
  },
  inProgress: {
    flexDirection: "row",
    backgroundColor: "#E8EBF8",
    width: 120,
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 15,
    height: 25,
  },
  inReview: {
    flexDirection: "row",
    backgroundColor: "#F5F6FB",
    width: 120,
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 15,
    height: 25,
  },
  textCompleted: {
    color: "#3D9A6D",
  },
  textUnAssigned: {
    color: "#8F97A1",
  },
  textInReview: {
    color: "#8F97A1",
  },
  textInProgress: {
    color: "#735EA8",
  },
})

export default IndividualTask
