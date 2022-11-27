import React, { FC, useEffect, useState } from "react"
import { Text, TextInput, View, Image, StyleSheet, TouchableOpacity } from "react-native"
import { ProgressBar } from "react-native-paper"
import { colors } from "../../../../theme"
import TaskStatusDropdown from "./TaskStatusDropdown"

import { Feather } from "@expo/vector-icons"
import ComboBox from "./ComboBox"
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { useStores } from "../../../../models"
import EstimateTime from "./EstimateTime"
import { ITeamTask } from "../../../../services/interfaces/ITask"

export interface Props {
}

const NewTimerCard: FC<Props> = () => {
  const {
    authenticationStore: { tenantId, organizationId, authToken },
    teamStore: { activeTeamId },
    TaskStore: { createNewTask, setActiveTask, activeTask, getTeamTasks, teamTasks }
  } = useStores();
  const [showCombo, setShowCombo] = useState(false)
  const [text1, setText1] = useState("")
  const [text2, setText2] = useState("")
  const [taskInputText, setTaskInputText] = useState<string>("")



  const onCreateNewTask = async () => {

    createNewTask({ organizationId, teamId: activeTeamId, authToken, taskTitle: taskInputText, tenantId })

  }


  const handleChangeText = (value: string) => {
    setTaskInputText(value)
    if (value.trim().length >0) {
      setShowCombo(true)
    } else {
      setShowCombo(false)
    }
  }

  const handleActiveTask = (value: ITeamTask) => {
    setActiveTask(value);
    setTaskInputText(value.title)
    setShowCombo(false)
  }



  useEffect(() => {
    getTeamTasks({ tenantId, organizationId, activeTeamId, authToken })
  }, [])

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
          // onEndEditing={() => setShowCombo(false)}
          onFocus={() => setShowCombo(true)}
          onChangeText={(newText) => handleChangeText(newText)}
        />
        {taskInputText.length < 4 ? null : (
          <TouchableOpacity onPress={()=>onCreateNewTask()}>
          <Feather name="check" size={24} color="green" />
          </TouchableOpacity>
        )}
      </View>

      {showCombo && <ComboBox tasks={teamTasks} onCreateNewTask={onCreateNewTask} handleActiveTask={handleActiveTask} />}

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
          <Text style={{ fontWeight: "bold", fontSize: 35, color: "#1B005D" }}>01:10:36:20</Text>
          <ProgressBar progress={0.7} color="#28D581" />
        </View>
        <TouchableOpacity onPress={() => { }}>
          <Image source={require("../../../../../assets/images/play.png")}></Image>
        </TouchableOpacity>
      </View>
    </View>
  )
}

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
})

export default NewTimerCard
