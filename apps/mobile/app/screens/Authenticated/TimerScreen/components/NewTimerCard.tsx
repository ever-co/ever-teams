import React, { FC, useEffect, useState } from "react"
import { Text, TextInput, View, Image, StyleSheet, TouchableOpacity } from "react-native"
import { ActivityIndicator, ProgressBar } from "react-native-paper"
import { colors } from "../../../../theme"
import TaskStatusDropdown from "./TaskStatusDropdown"

import { Feather, AntDesign } from "@expo/vector-icons"
import ComboBox from "./ComboBox"
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { useStores } from "../../../../models"
import EstimateTime from "./EstimateTime"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import { observer } from "mobx-react-lite"
import { pad } from "../../../../helpers/number"
import { useTimer } from "../../../../services/hooks/useTimer"

export interface Props {
}

const NewTimerCard: FC<Props> = observer(() => {
  const {
    authenticationStore: { tenantId, organizationId, authToken },
    teamStore: { activeTeamId, activeTeam },
    TaskStore: { createNewTask, setActiveTask, activeTask, getTeamTasks, fetchingTasks },
    TimerStore: { timerStatusState, localTimerStatusState, timeCounterState }
  } = useStores();
  const {
    startTimer,
    stopTimer,
    getTimerStatus,
    toggleTimer,
    firstLoadTimerData,
    firstLoad,
    timeCounter,
    fomatedTimeCounter: { hours, minutes, seconds, ms_p },
    timerStatusFetchingState,
    canRunTimer,
  } = useTimer();
  const [showCombo, setShowCombo] = useState(false)
  const [taskInputText, setTaskInputText] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showCheckIcon, setShowCheckIcon] = useState<boolean>(false)



  const onCreateNewTask = async () => {
    setShowCheckIcon(false)
    setIsLoading(true)
    await createNewTask({ organizationId, teamId: activeTeamId, authToken, taskTitle: taskInputText, tenantId })
    setIsLoading(false)
  }


  const handleChangeText = (value: string) => {
    setTaskInputText(value)
    if (value.trim().length > 0) {
      setShowCombo(true)
      setShowCheckIcon(false)
    } else {
      setShowCombo(false)
    }

    if (value.trim().length >= 3) {
      setShowCheckIcon(true)
    }
  }

  const handleActiveTask = (value: ITeamTask) => {
    setActiveTask(value);
    setShowCheckIcon(false)
    setTaskInputText(value.title)
    setShowCombo(false)
  }


  useEffect(() => {
    handleChangeText("")
  }, [activeTeam])

  return (
    <View style={styles.mainContainer}>
      <Text style={styles.working}>What you working on?</Text>
      <View
        style={[
          styles.wrapInput,
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 10,
          },
        ]}
      >
        <TextInput
          selectionColor={colors.primary}
          style={styles.textInput}
          defaultValue={activeTask.title}
          value={taskInputText}
          onFocus={() => setShowCombo(true)}
          onChangeText={(newText) => handleChangeText(newText)}
        />
        {showCheckIcon && (
          <TouchableOpacity onPress={() => onCreateNewTask()}>
            <Feather name="check" size={24} color="green" />
          </TouchableOpacity>
        )}
        {isLoading ? <ActivityIndicator color="#1B005D" style={styles.loading} /> : null}
      </View>

      {showCombo && <ComboBox onCreateNewTask={onCreateNewTask} handleActiveTask={handleActiveTask} />}

      <View
        style={{
          flexDirection: "row",
          marginBottom: 40,
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          <Text style={{ textAlign: 'center', textAlignVertical: 'center' }}>Estimate:</Text>
          <EstimateTime />
        </View>
        <TaskStatusDropdown />
      </View>

      <View style={styles.horizontal}>
        <View style={{ width: "70%", marginRight: 10, justifyContent: "space-around" }}>
          <Text style={{ fontWeight: "bold", fontSize: 35, color: "#1B005D" }}>{pad(hours)}:{pad(minutes)}:{(pad(seconds))}:<Text style={{ fontSize: 25 }}>{pad(ms_p)}</Text></Text>
          <ProgressBar progress={0.7} color="#28D581" />
        </View>

        {localTimerStatusState.running ? (
          <AntDesign name="pausecircle" size={64} color="#1B005D" onPress={() => stopTimer()} />
        ) : (
          <AntDesign style={{ opacity: canRunTimer ? 1 : 0.4 }} name="play" size={64} color="#1B005D" onPress={() => { canRunTimer ? startTimer() : {} }} />
        )}
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  mainContainer: {
    marginTop: 20,
    paddingTop: 30,
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 20,
    ...GS.noBorder,
    borderWidth: 1,
    elevation: 5,
    shadowColor: "#1B005D0D",
    shadowOffset: { width: 10, height: 10.5 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  estimate: {
    color: "#9490A0",
    fontWeight: "600",
    fontSize: 12,
    marginBottom: 10,
    alignSelf: "flex-end",
  },
  working: {
    color: "#9490A0",
    fontWeight: "600",
    marginBottom: 10,
  },
  horizontal: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  textInput: {
    color: colors.primary,
    width: '85%',
    height: '90%'
  },
  textInputOne: {
    height: 30,
  },
  horizontalInput: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  dashed: {
    borderBottomColor: "#fff",
    borderBottomWidth: 10,
  },
  separator: {
    backgroundColor: colors.border,
    width: 2,
    marginHorizontal: 5,
    transform: [{ rotate: "20deg" }],
    height: 20,
  },
  wrapInput: {
    backgroundColor: "#EEEFF5",
    height: 50,
    width: "100%",
    borderRadius: 10,
    marginBottom: 6,
  },
  loading: {
    position: 'absolute',
    right: 10,
    top: 15
  }
})

export default NewTimerCard
