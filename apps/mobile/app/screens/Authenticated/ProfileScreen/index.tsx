import React, { FC, useState } from "react"
import { ImageStyle, ScrollView, TextStyle, TouchableOpacity, View, ViewStyle, Dimensions, Text } from "react-native"

// TYPES
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"
// DATA

// COMPONENTS
import { Screen } from "../../../components"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../assets/ts/styles"
import { colors, spacing, typography } from ".././../../theme"
import HomeHeader from "../TeamScreen/components/HomeHeader"
import ProfileHeader from "./components/ProfileHeader"
import FilterSection from "./components/FilterSection"
import ListCardItem from "./components/ListCardItem"
import { useStores } from "../../../models"
import { ITaskStatus, ITeamTask } from "../../../services/interfaces/ITask"
import { observer } from "mobx-react-lite"

const { width, height } = Dimensions.get("window")
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
        <View style={{ paddingTop: 10 }}>
          <ProfileHeader {...memberInfo} />
        </View>
        <View style={{ zIndex: 1000, padding: 10, paddingBottom: 30, flexDirection: "row", justifyContent: "space-between", backgroundColor: "#fff", opacity: 0.7 }}>
          <TouchableOpacity style={$assignStyle}>
            <Text style={$createTaskTitle}>Create Task</Text>
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
              <Text style={[$tabText, { color: selectedTabIndex === idx ? "#3826A6" : "#7E7991" }]}>{item}</Text>
              <View style={[$wrapperCountTasks, { backgroundColor: selectedTabIndex === idx ? "#3826A6" : "#F5F5F5" }]}>
                <Text style={[$countTasks, { color: selectedTabIndex === idx ? "#FFF" : "#7E7991" }]}>3</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView
          style={{
            flex: 1,
            zIndex: 998,
            paddingHorizontal: 20,
            paddingBottom: 50,
            backgroundColor: "#f2f2f2",
          }}
        >
          {/* START WORKED TAB CONTENT */}
          {selectedTabIndex === 0 &&
            <View>
              <View>
                <View
                  style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 20 }}
                >
                  <Text style={$textLabel}>Now</Text>
                  <View style={{ width: width / 1.8, alignSelf: 'center', borderBottomWidth: 1, borderBottomColor: "rgba(0, 0, 0, 0.16)" }} />
                  <View style={{ flexDirection: "row" }}>
                    <Text style={{ color: "#B1AEBC", fontSize: 12, fontFamily: typography.secondary }}>Total Time:</Text>
                    <Text style={[$textLabel, { marginLeft: 5, color: colors.primary, fontFamily: typography.primary, fontSize: 12 }]}>03:31</Text>
                  </View>
                </View>
                {activeTask.id &&
                  <ListCardItem tabIndex={selectedTabIndex} isActive={true} item={activeTask as ITeamTask} enableEstimate={false} handleEstimate={() => { }} handleTaskTitle={() => { }} />}
              </View>
              <View>
                <View
                  style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 20 }}
                >
                  <Text style={$textLabel}>Last 24 hours ({otherTasks.length})</Text>
                  <View style={{ width: width / 1.5, alignSelf: 'center', top: 3, borderBottomWidth: 1, borderBottomColor: "rgba(0, 0, 0, 0.16)" }} />
                </View>
                {otherTasks.map((item, index) => (
                  <ListCardItem
                    tabIndex={selectedTabIndex}
                    isActive={false} key={index.toString()} item={item as any} enableEstimate={false} />
                ))}
              </View>
            </View>
          }
          {/* END WORKED TAB CONTENT */}
          {/* ------------------------------------------------------------ */}
          {/* START ASSIGNED TAB CONTENT */}

          {selectedTabIndex === 1 &&
            <View style={{ ...GS.mt2 }}>
              {activeTask.id &&
                <ListCardItem
                  tabIndex={selectedTabIndex}
                  isActive={false}
                  item={activeTask as ITeamTask}
                  enableEstimate={false}
                  handleEstimate={() => { }}
                  handleTaskTitle={() => { }}
                />
              }
              <View>
                {otherTasks.map((item, index) => (
                  <ListCardItem tabIndex={selectedTabIndex} isActive={false} key={index.toString()} item={item as any} enableEstimate={false} />
                ))}
              </View>
            </View>
          }

          {/* END ASSIGNED TAB CONTENT */}
          {/* ----------------------------------------------------------------------- */}

          {/* START UNASSIGNED TAB CONTENT */}
          {selectedTabIndex === 2 &&
            <View style={{ ...GS.mt2 }}>
              {activeTask.id &&
                <ListCardItem
                  tabIndex={selectedTabIndex}
                  isActive={false}
                  item={activeTask as ITeamTask}
                  enableEstimate={false}
                  handleEstimate={() => { }}
                  handleTaskTitle={() => { }}
                />
              }
              <View>
                {otherTasks.map((item, index) => (
                  <ListCardItem tabIndex={selectedTabIndex} isActive={false} key={index.toString()} item={item as any} enableEstimate={false} />
                ))}
              </View>
            </View>
          }
          {/* END UNASSIGNED TAB CONTENT */}

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
  fontFamily: typography.primary,
  fontSize: 12
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
  padding: 10,
  flexDirection: "row"
}

const $unselectedTab: ViewStyle = {
  padding: 10,
  flexDirection: "row"
}
const $wrapperCountTasks: ViewStyle = {
  width: 18,
  left: 3,
  borderRadius: 4,
  paddingHorizontal: 2,
  height: 18,
  justifyContent: "center",
  alignItems: 'center',
}

const $countTasks: TextStyle = {
  fontSize: 10,
  fontFamily: typography.secondary
}

const $assignStyle: ViewStyle = {
  borderColor: "#3826A6",
  borderWidth: 2,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 20,
  paddingVertical: 5,
  width: width / 2.5,
  borderRadius: 8
}

const $createTaskTitle: TextStyle = {
  fontSize: 14,
  fontFamily: typography.primary
}
const $tabText: TextStyle = {
  fontFamily: typography.primary,
  fontSize: 12,
}
