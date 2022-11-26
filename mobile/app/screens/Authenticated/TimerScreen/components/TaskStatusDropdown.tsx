import React, { FC } from "react"
import { View, StyleSheet, Image, TouchableOpacity } from "react-native"
import { AntDesign, Entypo, MaterialCommunityIcons } from "@expo/vector-icons"
import { ITaskStatus, ITeamTask } from "../../../../services/interfaces/ITask"

// COMPONENTS
import { Text } from "../../../../components"
import { useStores } from "../../../../models"
import { observer } from "mobx-react-lite"

export interface Props {
}

const TaskStatusDropdown: FC<Props> = observer(() => {
  const { 
    authenticationStore: { authToken, organizationId, tenantId },
   TaskStore:{activeTask, updateTask},
   teamStore:{activeTeamId}
 } = useStores();
  const [isOpened, setIsOpened] = React.useState(false)
  const [status, setStatus] = React.useState<ITaskStatus | null>(null)
  const statusList = ["Todo", "In Progress", "For Testing", "Completed", "Unassigned"]

  const OnItemPressed = (text) => {
    setIsOpened(false)
    onChangeStatus(text);
  }
  const onChangeStatus = (text) => {
    const value:ITaskStatus=text;
    const task = {
     ...activeTask,
      status: value
    };
const refreshData={
  activeTeamId,
  tenantId,
  organizationId
}
  updateTask({ taskData: task, taskId: task.id, authToken , refreshData});
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: status === "Completed" ? "#D4F7E6" : "#EEEFF5" },
      ]}
    >
      <TouchableOpacity
        onPress={() => setIsOpened(!isOpened)}
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View>
            {status === null ? null : null}
            {status === statusList[3] ? <Entypo name="circle" size={14} color="gray" /> : null}
            {status === statusList[3] ? (
              <MaterialCommunityIcons name="progress-check" size={14} color="#1B005D" />
            ) : null}
            {status === statusList[3] ? <AntDesign name="search1" size={14} color="#1B005D" /> : null}
            {status === "Completed" ? (
              <AntDesign name="checkcircleo" size={14} color="green" />
            ) : null}
          </View>
          <Text
            style={[
              styles.dropdownItemTxt,
              {
                fontSize: 14,
                marginLeft: 5,
                color: status === "Completed" ? "green" : "#1B005D",
                fontWeight: "bold",
              },
            ]}
          >
            {activeTask.status}
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
              <Entypo name="circle" size={14} color="gray" />
              <Text style={[styles.dropdownItemTxt, { color: "gray", marginLeft: 5 }]}>
                {item}
              </Text>
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
    backgroundColor: "#EEEFF5",
    padding: 8,
    borderRadius: 5,
    width: "45%",
    height: 40,
    marginTop: 5,
    zIndex: 1,
  },
  dropdownContainer: {
    backgroundColor: "#FFF",
    position: "absolute",
    shadowColor: "gray",
    paddingHorizontal: 5,
    top: 41,
    width: "110%",
    borderRadius: 5,
    zIndex: 1000,
    elevation: 9,
  },
  dropdownItem: {
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  dropdownItemTxt: {
    color: "#1B005D",
    marginLeft: 5,
  },
  iconStyle: {
    width: 12,
    height: 12,
    marginRight: 5,
  },
})
