import React, { FC, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Text } from "react-native-paper"
import { View, StyleSheet, Dimensions } from "react-native"
import { ScrollView, TouchableOpacity } from "react-native-gesture-handler"
import { Ionicons } from "@expo/vector-icons"
import IndividualTask from "./IndividualTask"
import TaskDisplayBox from "./TaskDisplayBox"
import { ITaskStatus, ITeamTask } from "../../../../services/interfaces/ITask"
import { useStores } from "../../../../models"
import { observer } from "mobx-react-lite"
import { colors, typography } from "../../../../theme"
import { translate } from "../../../../i18n"
import { useAppTheme } from "../../../../app"

export interface Props {
  handleActiveTask: (value: ITeamTask) => unknown
  onCreateNewTask: () => unknown
}
const { height } = Dimensions.get("window")
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
  
  const {colors}=useAppTheme();
  
  const { TaskStore: { teamTasks, fetchingTasks, filterDataByStatus } } = useStores();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"open" | "closed">("open")
  const [openFilter, setOpenFilter] = useState(true);
  const [closeFilter, setCloseFilter] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false)


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

  useEffect(() => {
    setIsLoading(fetchingTasks)
  }, [fetchingTasks])

  return (
    <View style={styles.mainContainer}>
      <TouchableOpacity onPress={() => onCreateTask()} 
      style={[styles.createTaskBtn,{backgroundColor:colors.background, borderColor:colors.secondary}]}
      >
        <Ionicons name="add-sharp" size={24} color={colors.secondary} />
        <Text style={[styles.createTaskTxt,{color:colors.secondary}]}>{translate("myWorkScreen.tabCreateTask")}</Text>
      </TouchableOpacity>
      <View style={styles.filterSection}>
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

      <ScrollView style={{ maxHeight: 350 }}>
        {/* <View style={styles.wrapList}> */}
        {filterDataByStatus(query, teamTasks, filter).map((task, i) => (
          <IndividualTask index={i} key={i} task={task} handleActiveTask={handleActiveTask} />
        ))}
        {/* </View> */}
      </ScrollView>
    </View>
  )
})

const styles = StyleSheet.create({
  mainContainer: {
    marginTop: 16,
    zIndex: 5,
    width: "100%",
  },
  createTaskBtn: {
    borderWidth: 1.5,
    width: '100%',
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: 'center',
    alignItems: 'center',
    height:33,
    paddingLeft: 24,
    paddingRight: 16
  },
  createTaskTxt: {
    color: '#3826A6',
    fontSize: 10,
    fontFamily: typography.fonts.PlusJakartaSans.semiBold,
    lineHeight: 12.6,
  },
  filterSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 26,
    paddingBottom: 16,
    width: 232
  },
  loading: {
    position: 'absolute',
    right: 10,
    top: 15
  },
  wrapList: {
    zIndex: 100,
    marginBottom: 20,
    maxHeight: height / 3
  }
})

export default ComboBox