import React, { FC, useEffect, useState } from "react";
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle, TextStyle, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AntDesign } from "@expo/vector-icons"
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { ITaskStatus, ITeamTask } from "../../../../services/interfaces/ITask";
import { BadgedTaskStatus, getBackground } from "../../../../components/StatusIcon";
import { observer } from "mobx-react-lite";
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks";
import { useAppTheme } from "../../../../app";
import { showMessage } from "react-native-flash-message";


interface TaskStatusProps {
  task?: ITeamTask;
  containerStyle?: ViewStyle;
  statusTextSyle?: TextStyle;
  dropdownContainerStyle?: ViewStyle;
  showTaskStatus: boolean;
  setShowTaskStatus: (value: boolean) => unknown
}

const TaskStatus: FC<TaskStatusProps> = observer(({ task, containerStyle, statusTextSyle, dropdownContainerStyle, setShowTaskStatus, showTaskStatus }) => {

  const { colors, dark } = useAppTheme();
  const { updateTask } = useTeamTasks();


  const onChangeStatus = async (text) => {
    const value: ITaskStatus = text;
    const taskEdit = {
      ...task,
      status: value
    };
    setShowTaskStatus(false)
    const { response } = await updateTask(taskEdit, task.id);

    if (response.status !== 202) {
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
            style={{ ...styles.container, ...containerStyle, backgroundColor: task ? getBackground({ status: task.status }) : "#F2F2F2" }}>
            {task ? <BadgedTaskStatus showColor={true} status={task.status} /> :
              <Text>Status</Text>
            }
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
        <View style={{ ...styles.container, ...containerStyle, backgroundColor: task ? getBackground({ status: task.status }) : "#F2F2F2" }}>
          {task ? <BadgedTaskStatus showColor={true} status={task.status} /> :
            <Text>Status</Text>
          }
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
    <View style={[styles.dropdownContainer, dropdownContainer, { backgroundColor: colors.background, shadowColor: dark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)" }]}>
      <View style={styles.secondContainer}>
        <Text style={[styles.dropdownTitle, { color: colors.primary }]}>Statuses</Text>
        <ScrollView style={{ backgroundColor: colors.background }}>
          {statusList.map((item, idx) => (
            <TouchableOpacity key={idx} style={[styles.dropdownItem, { backgroundColor: getBackground({ status: item }) }]} onPress={() => onChangeStatus(item)}>
              <BadgedTaskStatus status={item} showColor={false} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
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
  dropdownContainer: {
    position: "absolute",
    top: 47,
    borderRadius: 10,
    maxHeight: 240,
    zIndex: 1001,
    ...GS.noBorder,
    borderWidth: 1,
    elevation: 10,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    // overflow:"hidden"
  },
  secondContainer: {
    margin: 5,
    paddingBottom: 15
  },
  dropdownItem: {
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginVertical: 5,
    height: 44,
    borderRadius: 10,
    elevation: 10,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 1,
    // marginHorizontal: 5
  },
  dropdownTitle: {
    fontSize: 14,
    marginBottom: 5
  }
})

export default TaskStatus;