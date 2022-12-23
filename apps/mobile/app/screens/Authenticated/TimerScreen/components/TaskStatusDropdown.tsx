import React, { FC } from "react"
import { View, StyleSheet, Image, TouchableOpacity } from "react-native"
import { AntDesign, Entypo, MaterialCommunityIcons } from "@expo/vector-icons"
import { ITaskStatus, ITeamTask } from "../../../../services/interfaces/ITask"

// COMPONENTS
import { Text } from "../../../../components"
import { useStores } from "../../../../models"
import { observer } from "mobx-react-lite"


// STYLES
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { typography } from "../../../../theme"
import { BadgedTaskStatus } from "../../../../components/StatusIcon"

export interface Props {
  task: ITeamTask
}

const TaskStatusDropdown: FC<Props> = observer(({ task }) => {
  const {
    authenticationStore: { authToken, organizationId, tenantId },
    TaskStore: { activeTask, updateTask, setActiveTask },
    teamStore: { activeTeamId }
  } = useStores();
  const [isOpened, setIsOpened] = React.useState(false)
  const [status, setStatus] = React.useState<ITaskStatus | null>(null)
  const statusList: ITaskStatus[] = ["Todo", "In Progress", "For Testing", "Completed", "Unassigned", "In Review", "Closed"]

  const OnItemPressed = (text) => {
    setIsOpened(false)
    onChangeStatus(text);
  }
  const onChangeStatus =async (text) => {
    const value: ITaskStatus = text;
    const task = {
      ...activeTask,
      status: value
    };
    const refreshData = {
      activeTeamId,
      tenantId,
      organizationId
    }
    const taskEdited=await updateTask({ taskData: task, taskId: task.id, authToken, refreshData });
    setActiveTask(taskEdited);
  }

  return (
    <View
      style={[
        styles.container,
      ]}
    >
      <TouchableOpacity
        onPress={() => setIsOpened(!isOpened)}
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={[
              styles.dropdownItemTxt,
              {
                fontSize: 10,
                color: "#1B005D",
              },
            ]}
          >
            {task ? task.status : "Status"}
          </Text>
        </View>

        {isOpened ? (
          <AntDesign name="up" size={18} color="#1B005D" />
        ) : (
          <AntDesign name="down" size={18} color="#1B005D" />
        )}
      </TouchableOpacity>

      {isOpened ? (
        <View style={styles.dropdownContainer}>
          {statusList.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => OnItemPressed(item)}>
              <BadgedTaskStatus status={item} showColor={false} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <></>
      )}
    </View>
  )
})

export default TaskStatusDropdown

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F2F2F2",
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 10,
    width: "100%",
    height: "100%",
    zIndex: 999,
  },
  dropdownContainer: {
    backgroundColor: "#FFF",
    position: "absolute",
    paddingHorizontal: 5,
    top: 37,
    width: "100%",
    minWidth: 135,
    borderRadius: 5,
    zIndex: 1000,
    ...GS.noBorder,
    borderWidth: 1,
    elevation: 10,
    shadowColor: "rgba(0, 0, 0, 0.1)",
    shadowOffset: { width: 10, height: 10.5 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  dropdownItem: {
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownItemTxt: {
    color: "#282048",
    fontFamily: typography.fonts.PlusJakartaSans.semiBold,
    fontSize: 10

  },
  iconStyle: {
    width: 12,
    height: 12,
    marginRight: 5,
  },
})
