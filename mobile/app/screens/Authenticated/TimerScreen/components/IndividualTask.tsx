import React, { FC, useState } from "react"
import { View, StyleSheet, Text, Image, ImageStyle, TouchableOpacity } from "react-native"
import { AntDesign, Entypo } from "@expo/vector-icons"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, spacing } from "../../../../theme"
import DeletePopUp from "./DeletePopUp"
import { ITeamTask } from "../../../../services/interfaces/ITask"

export interface Props {
  task: ITeamTask
  handleActiveTask: (value: ITeamTask) => unknown
}

const IndividualTask: FC<Props> = ({ task, handleActiveTask }) => {
  const [showDel, setShowDel] = useState(false)

  return (
    <TouchableOpacity style={styles.container} onPress={() => handleActiveTask(task)}>
      <Text style={{ color: "#1B005D", fontSize: 10 }}>{task.title}</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={
            task.status === "Completed"
              ? styles.completed
              : task.status === "In Review"
                ? styles.inReview
                : task.status === "In progress"
                  ? styles.inProgress
                  : styles.unAssigned
          }
        >
          {task.status === "Completed" ? (
            <AntDesign name="checkcircleo" size={8} color="#3D9A6D" />
          ) : task.status === "In Review" ? (
            <AntDesign name="search1" size={8} color="#8F97A1" />
          ) : task.status === "In progress" ? (
            <MaterialCommunityIcons name="progress-check" size={8} color="#735EA8" />
          ) : (
            <Entypo name="circle" size={8} color="#8B7FAA" />
          )}

          <Text
            style={
              task.status === "Completed"
                ? styles.textCompleted
                : task.status === "In Review"
                  ? styles.textInReview
                  : task.status === "In progress"
                    ? styles.textInProgress
                    : styles.textUnAssigned
            }
          >
            {task.status}
          </Text>
          <AntDesign
            name="down"
            size={8}
            color={
              task.status === "Completed"
                ? "#3D9A6D"
                : task.status === "In Review"
                  ? "#8F97A1"
                  : task.status === "In progress"
                    ? "#735EA8"
                    : "#8B7FAA"
            }
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flexDirection: "row" }}>
            <Image source={{ uri: task.creator.imageUrl }} style={$usersProfile} />
          </View>
          <Entypo name="cross" size={15} color="#8F97A1" onPress={() => setShowDel(!showDel)} />
          {/* {showDel && <DeletePopUp index={index} removeUser={removeUser} setShowDel={setShowDel} />} */}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "center",
    borderBottomColor: "#8F97A1",
    borderBottomWidth: 1,
    justifyContent: "space-between",
    paddingBottom: 5,
  },
  statusDisplay: {
    flexDirection: "row",
  },
  completed: {
    flexDirection: "row",
    backgroundColor: "#D4F7E6",
    width: 70,
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 15,
    height: 15,
  },
  unAssigned: {
    flexDirection: "row",
    backgroundColor: "#F2F4F6",
    width: 70,
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 15,
    height: 15,
  },
  inProgress: {
    flexDirection: "row",
    backgroundColor: "#E8EBF8",
    width: 70,
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 15,
    height: 15,
  },
  inReview: {
    flexDirection: "row",
    backgroundColor: "#F5F6FB",
    width: 70,
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 15,
    height: 15,
  },
  textCompleted: {
    color: "#3D9A6D",
    fontSize: 8,
  },
  textUnAssigned: {
    color: "#8F97A1",
    fontSize: 8,
  },
  textInReview: {
    color: "#8F97A1",
    fontSize: 8,
  },
  textInProgress: {
    color: "#735EA8",
    fontSize: 8,
  },
})

const $usersProfile: ImageStyle = {
  ...GS.roundedFull,
  backgroundColor: colors.background,
  width: spacing.extraLarge - spacing.tiny,
  height: spacing.extraLarge - spacing.tiny,
}

const $usersProfileOne: ImageStyle = {
  ...GS.roundedFull,
  backgroundColor: colors.background,
  width: spacing.extraLarge - spacing.tiny,
  height: spacing.extraLarge - spacing.tiny,
  zIndex: 7,
  position: "relative",
  left: "50%",
}

export default IndividualTask
