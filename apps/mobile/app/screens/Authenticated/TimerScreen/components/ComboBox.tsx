import React, { FC, useState } from "react"
import { Text } from "react-native-paper"
import { View, StyleSheet } from "react-native"
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler"
import IndividualTask from "./IndividualTask"
import TaskDisplayBox from "./TaskDisplayBox"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import { useStores } from "../../../../models"
import { observer } from "mobx-react-lite"

export interface Props {
  tasks: ITeamTask[],
  handleActiveTask: (value: ITeamTask) => unknown
  onCreateNewTask: () => unknown
}


const ComboBox: FC<Props> =observer(function ComboBox({ tasks, onCreateNewTask, handleActiveTask }) {
  const [users, setUsers] = useState([])

  const removeUser = (index) => {
    let newUser = users.filter((user) => user.index !== index)
    setUsers(newUser)
  }

  const onCreateTask = () => {
    onCreateNewTask()
  }

  return (
    <View style={styles.mainContainer}>
      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        <TaskDisplayBox text="32 Open" openTask />
        <TaskDisplayBox text="25 Closed" openTask={false} />
      </View>

      <TouchableOpacity onPress={() => onCreateTask()} style={styles.createTaskBtn}>
        <Text>Create New Task</Text>
      </TouchableOpacity>
      <ScrollView>
      <View>
        {tasks.map((task, i) => (
          <IndividualTask key={i} task={task} handleActiveTask={handleActiveTask} />
        ))}
      </View>
      </ScrollView>
    </View>
  )
})

const styles = StyleSheet.create({
  mainContainer: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    borderColor: "#1B005D0D",
    borderWidth: 1,
    marginHorizontal: 5,
    shadowColor: "#1B005D",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 5,
    position: "absolute",
    top: "39%",
    left: 15,
    maxHeight: 300,
    width: "100%",
  },
  createTaskBtn: {
    borderColor: 'gray',
    borderWidth: 1,
    width: '60%',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5
  }
})

export default ComboBox
