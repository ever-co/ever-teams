import React, { FC, useEffect, useState } from "react"
import { Text, TextInput, View, Image, StyleSheet, TouchableOpacity } from "react-native"
import { ProgressBar } from "react-native-paper"
import { colors } from "../../../../theme"
import TaskStatusDropdown from "./TaskStatusDropdown"

import { Feather } from "@expo/vector-icons"
import ComboBox from "./ComboBox"
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { createTaskRequest, getTeamTasksRequest } from "../../../../services/requests/tasks"
import { useStores } from "../../../../models"
import { ICreateTask, ITeamTask } from "../../../../services/interfaces/ITask"

export interface Props {
  tasks: ITeamTask[],
}

const NewTimerCard: FC<Props> = ({ tasks }) => {
  const { authenticationStore: { tenantId, organizationId, activeTeamIdState, authToken, activeTaskState, setActiveTaskState, setActiveTaskId } } = useStores();
  const [showCombo, setShowCombo] = useState(false)
  const [text1, setText1] = useState("")
  const [text2, setText2] = useState("")
  const [taskInputText, setTaskInputText] = useState<string>("")
  const [activeTask, setActiveTask] = useState<ITeamTask>(activeTaskState)

  const onCheckLimitOne = (value: string) => {
    const parsedQty = Number.parseInt(value)
    if (Number.isNaN(parsedQty)) {
      setText1("")
    } else if (parsedQty > 23) {
      setText1("23")
    } else {
      setText1(parsedQty.toString())
    }
  }

  const onCheckLimitTwo = (value: string) => {
    const parsedQty = Number.parseInt(value)
    if (Number.isNaN(parsedQty)) {
      setText2("")
    } else if (parsedQty > 59) {
      setText2("59")
    } else {
      setText2(parsedQty.toString())
    }
  }

  const createNewTask = async () => {
    if (taskInputText.trim().length < 2) return;

    const dataBody: ICreateTask = {
      title: taskInputText,
      status: "Todo",
      description: "",
      tags: [],
      teams: [{
        id: activeTeamIdState
      }],
      estimate: 0,
      organizationId: organizationId,
      tenantId: tenantId
    }
    const { data } = await createTaskRequest({
      data: dataBody,
      bearer_token: authToken
    })
    setShowCombo(false)
    //setTaskInputText("");
  }


  const handleChangeText = (value: string) => {
    setTaskInputText(value)
    if (value.trim().length > 2) {
      setShowCombo(true)
    } else {
      setShowCombo(false)
    }
  }

  const handleActiveTask = (value: ITeamTask) => {
    if (value) {
      setActiveTaskId(value.id)
      setActiveTaskState(value)
      setActiveTask(value)
      setTaskInputText(value.title)
      setShowCombo(false);
    }
    console.log(value)
  }

  useEffect(()=>{
    setActiveTask(activeTaskState)
  },[activeTaskState])

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
        {taskInputText === "" || taskInputText.length > 5 ? null : (
          <Feather name="check" size={24} color="green" />
        )}
      </View>

      {showCombo && <ComboBox tasks={tasks} onCreateNewTask={createNewTask} handleActiveTask={handleActiveTask} />}

      <View
        style={{
          flexDirection: "row",
          marginBottom: 40,
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "flex-start", alignItems: "center" }}>
          <View style={{ paddingTop: 20, marginRight: 7 }}>
            <Text style={styles.estimate}>Estimate: </Text>
          </View>
          <View style={styles.horizontalInput}>
            <TextInput
              selectionColor={colors.primary}
              style={
                text1 === "" && text2 === ""
                  ? {
                    borderColor: colors.border,
                    borderBottomWidth: 2,
                    borderStyle: "dashed",
                    width: 20,
                    color: "#9490A0",
                    height: 15,
                  }
                  : {
                    borderColor: colors.border,
                    borderBottomWidth: 0,
                    borderStyle: "dashed",
                    width: 20,
                    color: "#9490A0",
                    height: 15,
                  }
              }
              onChangeText={onCheckLimitOne}
              defaultValue={text1}
              maxLength={2}
              keyboardType="numeric"
            />
            <Text style={{ color: "#9490A0" }}>h</Text>
            <View style={styles.separator} />
            <TextInput
              selectionColor={colors.primary}
              style={
                text2 === "" && text1 === ""
                  ? {
                    borderColor: colors.border,
                    borderBottomWidth: 2,
                    borderStyle: "dashed",
                    width: 20,
                    color: "#9490A0",
                    height: 15,
                  }
                  : {
                    borderColor: colors.border,
                    borderBottomWidth: 0,
                    borderStyle: "dashed",
                    width: 20,
                    color: "#9490A0",
                    height: 15,
                  }
              }
              onChangeText={onCheckLimitTwo}
              defaultValue={text2}
              maxLength={2}
              keyboardType="numeric"
            />
            <Text style={{ color: "#9490A0" }}>m</Text>
            <View style={{ justifyContent: "flex-end" }}>
              {text1 === "" && text2 === "" ? null : (
                <Feather name="check" size={15} color="green" />
              )}
            </View>
          </View>
        </View>
        <TaskStatusDropdown activeTaskStatus={activeTask.status} />
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
