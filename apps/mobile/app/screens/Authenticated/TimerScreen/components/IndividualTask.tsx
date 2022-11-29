import React, { FC, useState } from "react"
import { View, StyleSheet, Text, Image, ImageStyle, TouchableOpacity } from "react-native"
import { AntDesign, Entypo, EvilIcons, MaterialCommunityIcons } from "@expo/vector-icons"
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, spacing } from "../../../../theme"
import DeletePopUp from "./DeletePopUp"
import { ITaskStatus, ITeamTask } from "../../../../services/interfaces/ITask"
import { useStores } from "../../../../models"
import { observer } from "mobx-react-lite"


export interface Props {
  task: ITeamTask
  handleActiveTask: (value: ITeamTask) => unknown
}

const IndividualTask: FC<Props> = observer(({ task, handleActiveTask }) => {
  const [showDel, setShowDel] = useState(false)
  const {
    authenticationStore: { tenantId, authToken, organizationId },
    teamStore: { activeTeamId },
    TaskStore: { updateTask }
  } = useStores();

  const onCloseTask = () => {
    const value: ITaskStatus = "Closed";
    const EditTask = {
      ...task,
      status: value
    };
    const refreshData = {
      activeTeamId,
      tenantId,
      organizationId
    }
    updateTask({ taskData: EditTask, taskId: task.id, authToken, refreshData });
  }

  const reOpen=()=>{
    const value: ITaskStatus = "Todo";
    const EditTask = {
      ...task,
      status: value
    };
    const refreshData = {
      activeTeamId,
      tenantId,
      organizationId
    }
    updateTask({ taskData: EditTask, taskId: task.id, authToken, refreshData });
  }

  return (
    <TouchableOpacity style={styles.container} onPress={() => handleActiveTask(task)}>
      <View style={{ flexDirection: "row" }}>
        <Text style={{ color: "#9490A0", fontSize: 12 }}>{`#${task.taskNumber}`}</Text>
        <Text style={{ color: "#1B005D", fontSize: 12, marginLeft: 5 }}>{task.title}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={
            task.status === "Completed"
              ? styles.completed
              : task.status === "In Progress"
                ? styles.inReview
                : task.status === "For Testing"
                  ? styles.inProgress
                  : styles.unAssigned
          }
        >
          {task.status === "Completed" ? (
            <AntDesign name="checkcircleo" size={8} color="#3D9A6D" />
          ) : task.status === "In Review" ? (
            <AntDesign name="search1" size={8} color="#8F97A1" />
          ) : task.status === "In Progress" ? (
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
                  : task.status === "In Progress"
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
                  : task.status === "In Progress"
                    ? "#735EA8"
                    : "#8B7FAA"
            }
          />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flexDirection: "row" }}>
            <Image source={{ uri: task.creator.imageUrl }} style={$usersProfile} />
          </View>
          {task.status === "Closed" ? <EvilIcons name="refresh" size={24} color="#8F97A1" onPress={()=>reOpen()}  /> :
            <Entypo name="cross" size={15} color="#8F97A1" onPress={() => setShowDel(!showDel)} />}
          {showDel && <DeletePopUp onCloseTask={onCloseTask} setShowDel={setShowDel} />}
        </View>
      </View>
    </TouchableOpacity>
  )
})

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
