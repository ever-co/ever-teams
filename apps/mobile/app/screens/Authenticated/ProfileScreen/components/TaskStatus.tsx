import React, { FC, useState } from "react";
import { TouchableOpacity, View, Image, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AntDesign } from "@expo/vector-icons"
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { ITaskStatus, ITeamTask } from "../../../../services/interfaces/ITask";
import { BadgedTaskStatus, getBackground, StatusIcon } from "../../../../components/StatusIcon";
import { observer } from "mobx-react-lite";
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks";
import { useAppTheme } from "../../../../app";
import { typography } from "../../../../theme/typography";
import { showMessage } from "react-native-flash-message";


interface TaskStatusProps {
  task?: ITeamTask;
  containerStyle?: ViewStyle;
  statusTextSyle?: TextStyle;
  dropdownContainerStyle?: ViewStyle;
}

const TaskStatus: FC<TaskStatusProps> = observer(({ task, containerStyle, statusTextSyle, dropdownContainerStyle }) => {

  const { colors, dark } = useAppTheme();
  const { updateTask } = useTeamTasks();
  const [showTaskStatus, setShowTaskStatus] = useState(false);


  const onChangeStatus = async (text) => {
    const value: ITaskStatus = text;
    const taskEdit = {
      ...task,
      status: value
    };
    setShowTaskStatus(false)
    const { response } = await updateTask(taskEdit, task.id);

    if (response.status === 202) {
      showMessage({
        message: "Updated",
        type: "success",
      })
    } else {
      showMessage({
        message: "Something went wrong",
        type: "danger",
      })
    }

  }

  if (dark) {
    return (
      <>
        <TouchableOpacity onPress={() => setShowTaskStatus(!showTaskStatus)}>
          <LinearGradient
            colors={["#E6BF93", "#D87555"]}
            end={{ y: 0.5, x: 1 }}
            start={{ y: 1, x: 0 }}
            style={{ ...styles.container, ...containerStyle, backgroundColor: getBackground({ status: task.status }) }}>
            <BadgedTaskStatus showColor={true} status={task ? task.status : "Todo"} />
            <AntDesign name="down" size={14} color={colors.primary} />
          </LinearGradient>
        </TouchableOpacity>
        {showTaskStatus && <TaskStatusDropDown dropdownContainer={dropdownContainerStyle} onChangeStatus={onChangeStatus} />}
      </>
    )
  }


  return (
    <>
      <TouchableOpacity onPress={() => setShowTaskStatus(!showTaskStatus)} >
        <View style={{ ...styles.container, ...containerStyle }}>
          <BadgedTaskStatus showColor={true} status={task ? task.status : "Todo"} />
          <AntDesign name="down" size={14} color={colors.primary} />
        </View>
      </TouchableOpacity>
      {showTaskStatus && <TaskStatusDropDown dropdownContainer={dropdownContainerStyle} onChangeStatus={onChangeStatus} />}
    </>
  )
})

interface DropDownProps {
  dropdownContainer?: ViewStyle;
  onChangeStatus?: (status: string) => unknown
}

const TaskStatusDropDown: FC<DropDownProps> = observer(({ dropdownContainer, onChangeStatus }) => {

  const { colors, dark } = useAppTheme();
  const statusList: ITaskStatus[] = ["Todo", "In Progress", "For Testing", "Completed", "Unassigned", "In Review", "Closed"]

  return (
    <View style={[styles.dropdownContainer, dropdownContainer, { backgroundColor: colors.background }]}>
      {statusList.map((item, idx) => (
        <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => onChangeStatus(item)}>
          <BadgedTaskStatus status={item} showColor={false} />
        </TouchableOpacity>
      ))}
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    minWidth: 100,
    borderColor: "rgba(0,0,0,0.16)",
    borderWidth: 1,
    minHeight: 30,
    alignItems: "center",
    paddingHorizontal: 8,
    justifyContent: "space-between",
    flexDirection: "row",
    borderRadius: 10
  },
  secondCont: {
    flexDirection: 'row',
    paddingHorizontal: 5,
    width: "100%",
    height: "100%",
    justifyContent: 'space-between',
    alignItems: "center",
    borderRadius: 10
  },
  dropdownContainer: {
    position: "absolute",
    paddingHorizontal: 5,
    top: 47,
    borderRadius: 5,
    zIndex: 1001,
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
    fontFamily: typography.fonts.PlusJakartaSans.semiBold,
    fontSize: 10

  },
})

export default TaskStatus;