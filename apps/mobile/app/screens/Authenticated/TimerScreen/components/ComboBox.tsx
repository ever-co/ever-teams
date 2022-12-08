import React, { FC, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Text } from "react-native-paper"
import { View, StyleSheet } from "react-native"
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler"
import IndividualTask from "./IndividualTask"
import TaskDisplayBox from "./TaskDisplayBox"
import { ITaskStatus, ITeamTask } from "../../../../services/interfaces/ITask"
import { useStores } from "../../../../models"
import { observer } from "mobx-react-lite"

export interface Props {
  handleActiveTask: (value: ITeamTask) => unknown
  onCreateNewTask: () => unknown
}

export const h_filter = (status: ITaskStatus, filters: "closed" | "open") => {
  switch (filters) {
    case "open":
      return status !== "Closed";
    case "closed":
      return status === "Closed";
    default:
      return true;
  }
};


const ComboBox: FC<Props> = observer(function ComboBox({ onCreateNewTask, handleActiveTask }) {
  const { TaskStore: { teamTasks, fetchingTasks, filterDataByStatus } } = useStores();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"open" | "closed">("open")
  const [openFilter, setOpenFilter] = useState(true);
  const [closeFilter, setCloseFilter] = useState(false);
  const [isLoading, setIsLoading]=useState<boolean>(false)




  const filteredTasks2 = useMemo(() => {
    return query.trim() === ""
      ? teamTasks
      : teamTasks.filter((task) =>
        task.title
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "")
          .startsWith(query.toLowerCase().replace(/\s+/g, ""))
      );
  }, [query, teamTasks]);

  const onCreateTask = () => {
    onCreateNewTask()
  }

  useEffect(()=>{
    setIsLoading(fetchingTasks)
  },[fetchingTasks])

  return (
    <View style={styles.mainContainer}>
      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => {
          setOpenFilter(true)
          setCloseFilter(false)
          setFilter("open")
        }}>
          <TaskDisplayBox
            count={filteredTasks2.filter((f_task) => {
              return f_task.status !== "Closed";
            }).length}
            openTask selected={openFilter} />
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={() => {
          setOpenFilter(false)
          setCloseFilter(true)
          setFilter("closed")
        }}>
          <TaskDisplayBox count={
            filteredTasks2.filter((f_task) => {
              return f_task.status === "Closed";
            }).length
          } openTask={false} selected={closeFilter} />
        </TouchableOpacity>
        {/* {isLoading && <ActivityIndicator color="#1B005D" style={styles.loading} />} */}
      </View>

      <TouchableOpacity onPress={() => onCreateTask()} style={styles.createTaskBtn}>
        <Text>Create New Task</Text>
      </TouchableOpacity>
      <ScrollView>
        <View>
          {filterDataByStatus(query,teamTasks,filter).map((task, i) => (
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
    shadowColor: "#1B005D",
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 5,
    position: "absolute",
    top: "30%",
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
  },
  loading: {
    position: 'absolute',
    right: 10,
    top: 15
  }
})

export default ComboBox
