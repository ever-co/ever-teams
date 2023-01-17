import React, { FC, useState } from "react"
import { View, StyleSheet, Text, Image, ImageStyle, TouchableOpacity } from "react-native"
import { AntDesign, Entypo, EvilIcons, MaterialCommunityIcons } from "@expo/vector-icons"
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { colors, spacing, typography } from "../../../../theme"
import DeletePopUp from "./DeletePopUp"
import { ITaskStatus, ITeamTask } from "../../../../services/interfaces/ITask"
import { useStores } from "../../../../models"
import { observer } from "mobx-react-lite"
import TaskStatusDropdown from "./TaskStatusDropdown"
import TaskStatus from "../../ProfileScreen/components/TaskStatus"
import { useAppTheme } from "../../../../app"


export interface Props {
  task: ITeamTask,
  index: number,
  handleActiveTask: (value: ITeamTask) => unknown
}

const IndividualTask: FC<Props> = observer(({ task, handleActiveTask, index }) => {

  const { colors } = useAppTheme()
  const [showDel, setShowDel] = useState(false)
  const {
    authenticationStore: { tenantId, authToken, organizationId },
    teamStore: { activeTeamId },
    TaskStore: { }
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
    // updateTask({ taskData: EditTask, taskId: task.id, authToken, refreshData });
  }

  const reOpen = () => {
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
    // updateTask({ taskData: EditTask, taskId: task.id, authToken, refreshData });
  }

  return (
    <TouchableOpacity style={[styles.container, { zIndex: 1000 - index }]} onPress={() => handleActiveTask(task)}>
      <View style={{ flexDirection: "row", width: "40%" }}>
        {/* <Text style={{ color: "#9490A0", fontSize: 12 }}>{`#${task.taskNumber}`}</Text> */}
        <Text style={[styles.taskTitle, { color: colors.primary }]} numberOfLines={2}>{task.title}</Text>
      </View>
      <View style={{ flexDirection: "row", width: "55%", alignItems: "center", zIndex: 101, justifyContent: "space-between" }}>
        <View style={{ left: -15, width: 100, height: 27, borderRadius: 10, zIndex: 999 }}>
          <TaskStatus
            task={task}
            containerStyle={styles.statusContainer}
          />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "30%" }}>
          <View style={{ flexDirection: "row" }}>
            <Image source={{ uri: task.creator.imageUrl }} style={$usersProfile} />
            <Image source={{ uri: task.creator.imageUrl }} style={$usersProfile2} />
          </View>
          {task.status === "Closed" ? <EvilIcons name="refresh" size={24} color="#8F97A1" onPress={() => reOpen()} /> :
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
    alignItems: "center",
    borderBottomColor: "rgba(0, 0, 0, 0.06)",
    borderBottomWidth: 1,
    justifyContent: "space-between",
    paddingVertical: 12,
    zIndex: 100
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
  taskTitle: {
    color: "#282048",
    fontSize: 10,
    // marginLeft: 5,
    width: 99,
    fontFamily: typography.fonts.PlusJakartaSans.semiBold
  },
  statusContainer: {
    paddingHorizontal: 7,
    alignItems: "center",
    marginRight:6,
    width: 113,
    height: 27,
    backgroundColor:"#ECE8FC",
    borderColor: "transparent",
  }
})

const $usersProfile: ImageStyle = {
  ...GS.roundedFull,
  backgroundColor: colors.background,
  width: spacing.extraLarge - spacing.tiny,
  height: spacing.extraLarge - spacing.tiny,
  borderColor: "#fff",
  borderWidth: 2,
}

const $usersProfile2: ImageStyle = {
  ...GS.roundedFull,
  backgroundColor: colors.background,
  width: spacing.extraLarge - spacing.tiny,
  height: spacing.extraLarge - spacing.tiny,
  borderColor: "#fff",
  borderWidth: 2,
  position: "absolute",
  left: -15
}

export default IndividualTask
