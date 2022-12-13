import React, { FC, useState } from "react"
import { ImageStyle, ScrollView, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native"

// TYPES
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"
// DATA

// COMPONENTS
import { Screen, Text } from "../../../components"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../assets/ts/styles"
import { colors, spacing } from ".././../../theme"
import HomeHeader from "../TeamScreen/components/HomeHeader"
import ProfileHeader from "./components/ProfileHeader"
import FilterSection from "./components/FilterSection"
import ListCardItem from "./components/ListCardItem"
import { useStores } from "../../../models"
import { ITaskStatus, ITeamTask } from "../../../services/interfaces/ITask"
import { observer } from "mobx-react-lite"

export const AuthenticatedProfileScreen: FC<AuthenticatedTabScreenProps<"Profile">> = observer(
  function AuthenticatedProfileScreen(_props) {
    const { authenticationStore: { user },
      teamStore: { activeTeam },
      TaskStore: { teamTasks, activeTask }
    } = useStores();
    const [selectedTabIndex, setSelectedTabIndex] = useState(0);
    const [filterStatus, setFilterStatus] = useState<ITaskStatus>()
    const tabs = ["Worked", "Assigned", "Unassigned"];

    const { params } = _props.route;
    const memberInfo = params?.user || user;

    const members = activeTeam?.members || [];
    const currentUser = members.find((m) => {
      return m.employee.userId === memberInfo.id;
    });
    const member =
      user?.id === memberInfo.id ? user : currentUser?.employee.user;

    const filterTasksByStatus = (status: ITaskStatus) => {
      if (!status) return teamTasks;

      return teamTasks.filter((t) => t.status === status)
    }

    const new_teamTasks = filterTasksByStatus(filterStatus)

    const otherTasks = teamTasks
      ? new_teamTasks.filter((t) => t.id !== activeTask.id)
      : new_teamTasks;



    return (
      <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <HomeHeader {..._props} />
        <ProfileHeader {...memberInfo} />
        <View style={{ zIndex: 1000, padding: 10, flexDirection: "row", justifyContent: "space-between" }}>
          <TouchableOpacity style={$assignStyle}>
            <Text style={{ fontSize: 14 }}>Create Task</Text>
          </TouchableOpacity>
          <FilterSection selectStatus={setFilterStatus} />
        </View>
        <View style={{ flexDirection: 'row', width: "100%", justifyContent: "space-around", backgroundColor: "#fff" }}>
          {tabs.map((item, idx) => (
            <TouchableOpacity
              style={selectedTabIndex === idx ? $selectedTab : $unselectedTab}
              activeOpacity={0.7}
              key={idx}
              onPress={() => setSelectedTabIndex(idx)}
            >
              <Text>{item}</Text>
              <View style={[$wrapperCountTasks, { backgroundColor: selectedTabIndex === idx ? colors.primary : "#F2F2F2" }]}>
                <Text style={[$countTasks, { color: selectedTabIndex === idx ? "#F2F2F2" : colors.primary }]}>3</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView
          style={{
            flex: 1,
            zIndex: 998,
            paddingHorizontal: 10,
            paddingBottom: 50,
            backgroundColor: "#f2f2f2",
          }}
        >
          {selectedTabIndex === 0 &&
            <View>
              <View>
                <View
                  style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}
                >
                  <Text style={$textLabel}>Now</Text>
                  <View style={{ backgroundColor: "gray", width: "45%", height: 1, alignSelf: 'center', top: 2 }} />
                  <View style={{ flexDirection: "row" }}>
                    <Text style={{ color: "gray" }}>Total Time:</Text>
                    <Text style={[$textLabel, { marginLeft: 5 }]}>03:31</Text>
                  </View>
                </View>
                {activeTask.id &&
                  <ListCardItem item={activeTask as ITeamTask} enableEstimate={false} handleEstimate={() => { }} handleTaskTitle={() => { }} />}
              </View>
              <View>
                <View
                  style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}
                >
                  <Text style={$textLabel}>Others ({otherTasks.length})</Text>
                  <View style={{ backgroundColor: "gray", width: "100%", height: 1, alignSelf: 'center', marginLeft: 12, top: 2 }} />
                </View>
                {otherTasks.map((item, index) => (
                  <ListCardItem key={index.toString()} item={item as any} enableEstimate={false} />
                ))}
              </View>
            </View>
          }
        </ScrollView>
      </Screen>
    )
  }
)

const $container: ViewStyle = {
  flex: 1,
}

const $title: TextStyle = {
  marginBottom: spacing.large,
}

const $userProfile: ImageStyle = {
  ...GS.roundedFull,
  ...GS.mr2,
  ...GS.borderSm,
  backgroundColor: colors.background,
  width: spacing.huge * 2,
  height: spacing.huge * 2,
}

const $textLabel: TextStyle = {
  color: colors.primary,
  fontWeight: "700",
}

const $wrapComboboxes: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingBottom: 10,
  backgroundColor: colors.palette.neutral200,
  justifyContent: "space-around",
  zIndex: 999
}
const $selectedTab: ViewStyle = {
  borderBottomColor: colors.primary,
  borderBottomWidth: 2,
  padding: 5,
  flexDirection: "row"
}

const $unselectedTab: ViewStyle = {
  padding: 5,
  flexDirection: "row"
}
const $wrapperCountTasks: ViewStyle = {
  backgroundColor: "#F2F2F2",
  left: 3,
  borderRadius: 2,
  paddingHorizontal: 4,
  height: 17,
  justifyContent: "center",
  alignItems: 'center',
  top: 5
}

const $countTasks: TextStyle = {
  fontSize: 10,
  top: -3
}

const $assignStyle: ViewStyle = {
  borderColor: "#3826A6",
  borderWidth: 1.5,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 20,
  paddingVertical: 5,
  width: "40%",
  borderRadius: 8
}
