import React, { useState } from "react";
import { TouchableOpacity, View, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon, Text } from "../../../../components";
import { colors, spacing } from "../../../../theme"
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { useStores } from "../../../../models";
import { ITaskStatus, ITeamTask } from "../../../../services/interfaces/ITask";
import { BadgedTaskStatus, getBackground, StatusIcon } from "../../../../components/StatusIcon";
import { observer } from "mobx-react-lite";
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks";
import { useAppTheme } from "../../../../app";

const TaskStatus = observer((currentTask: ITeamTask) => {
  const {
    authenticationStore: { authToken, organizationId, tenantId },
    teamStore: { activeTeamId }
  } = useStores();
  const { colors, dark } = useAppTheme();
  const { updateTask } = useTeamTasks();
  const [showTaskStatus, setShowTaskStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ITaskStatus>(currentTask.status)
  const status: ITaskStatus[] = [
    "Todo",
    "In Progress",
    "In Review",
    "For Testing",
    "Unassigned",
    "Completed",
    "Closed"]

  const onChangeStatus = (text) => {
    const value: ITaskStatus = text;
    const task = {
      ...currentTask,
      status: value
    };
    const refreshData = {
      activeTeamId,
      tenantId,
      organizationId
    }
    updateTask(task, task.id);
  }


  return (
    <>

      <LinearGradient
        colors={["#E6BF93", "#D87555"]}
        end={{ y: 0.5, x: 1 }}
        start={{ y: 1, x: 0 }}
        style={{ ...styles.container, backgroundColor: getBackground({ status: selectedStatus }).light }}>
        <TouchableOpacity onPress={() => setShowTaskStatus(!showTaskStatus)} style={[styles.secondCont]}>
          <BadgedTaskStatus showColor={true} status={currentTask.status ? currentTask.status : "Todo"} />
          <Image source={require("../../../../../assets/icons/caretDown.png")} />
        </TouchableOpacity>
      </LinearGradient>
      <View
        style={{
          ...GS.positionAbsolute,
          ...GS.p2,
          ...GS.shadow,
          ...GS.r0,
          ...GS.roundedSm,
          top: 0,
          marginTop: 38,
          right: 0,
          // marginRight: spacing.small,
          backgroundColor: colors.background,
          width: "100%",
          ...(!showTaskStatus ? { display: "none" } : {}),
        }}
      >
        <View style={{}}>
          {status.map((item, idx) => (
            <TouchableOpacity style={{ marginBottom: 2 }} key={idx} onPress={() => {
              onChangeStatus(item)
              setSelectedStatus(item)
              setShowTaskStatus(false)
            }}>
              <BadgedTaskStatus showColor={false} status={item} />
            </TouchableOpacity>
          ))}

        </View>

        <TouchableOpacity style={{ position: 'absolute', right: 5, top: 5 }} onPress={() => setShowTaskStatus(!showTaskStatus)}>
          <Icon icon={"x"} />
        </TouchableOpacity>
      </View>
    </>
  )
})

const styles = StyleSheet.create({
  container: {
    height: "100%",
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
  }
})

export default TaskStatus;