import React, { FC, useEffect, useState } from "react"
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
import AssingTaskFormModal from "./components/AssignTaskSection"
import { BlurView } from "expo-blur"
import { useAuthTeamTasks } from "../../../services/hooks/features/useAuthTeamTasks"
import { useOrganizationTeam } from "../../../services/hooks/useOrganization"
import { useTeamTasks } from "../../../services/hooks/features/useTeamTasks"
import useAuthenticateUser from "../../../services/hooks/features/useAuthentificateUser"

const { width, height } = Dimensions.get("window")
export const AuthenticatedProfileScreen: FC<AuthenticatedTabScreenProps<"Profile">> = observer(
  function AuthenticatedProfileScreen(_props) {
    const { authenticationStore: { authToken, tenantId, organizationId },
      teamStore: { activeTeam },
      TaskStore: { teamTasks, activeTask }
    } = useStores();
    const { user } = useAuthenticateUser();
    const { params } = _props.route;
    const { tabIndex, userId } = params;
    const { members } = useOrganizationTeam();
    const { onAssignTask, onUnassignedTask, loadAssignAndUnassign } = useTeamTasks();

    const [selectedTabIndex, setSelectedTabIndex] = useState(tabIndex);
    const [filterStatus, setFilterStatus] = useState<ITaskStatus>()
    const [showModal, setShowModal] = useState(false)
    const tabs = ["Worked", "Assigned", "Unassigned"];


    const member = userId ? members.find((m) => {
      return m.employee.userId === userId;
    }) : user;

    const currentUser =
      user?.id === userId ? user : member?.employee.user;

    const isAuthUser = currentUser.id === user.id;

    const filterTasksByStatus = (status: ITaskStatus) => {
      if (!status) return teamTasks;

      return teamTasks.filter((t) => t.status === status)
    }

    const new_teamTasks = filterTasksByStatus(filterStatus)

    const otherTasks = activeTask
      ? new_teamTasks.filter((t) => t.id !== activeTask.id)
      : new_teamTasks;

    const { assignedTasks, unassignedTasks, countTasksByTab } = useAuthTeamTasks(currentUser);

    useEffect(() => {
      setSelectedTabIndex(tabIndex)
    }, [tabIndex])


    const hangleAssignTask = async (taskId: string) => {
      const data = await onAssignTask({
        taskId,
        memberId: currentUser?.id
      })
    }

    const hangleUnassignTask = async (taskId: string) => {
      const data = await onUnassignedTask({
        taskId,
        memberId: currentUser?.id
      })
    }

    return (
      <>
        {showModal && <BlurView tint="dark" intensity={18} style={$blurContainer} />}
        <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
          <AssingTaskFormModal memberId={currentUser?.id} visible={showModal} onDismiss={() => setShowModal(false)} />
          <HomeHeader props={_props} showTimer={true} />
          <View style={{ paddingTop: 10 }}>
            <ProfileHeader {...currentUser} />
          </View>
          <View style={{ zIndex: 1000, padding: 10, paddingBottom: 30, flexDirection: "row", justifyContent: "space-between", backgroundColor: "#fff", opacity: 0.7 }}>
            <TouchableOpacity onPress={() => setShowModal(true)} style={$assignStyle}>
              <Text style={$createTaskTitle}>{isAuthUser ? "Create Task" : "Assign Task"}</Text>
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
                  <Text style={[$countTasks, { color: selectedTabIndex === idx ? "#FFF" : "#7E7991" }]}>{countTasksByTab(idx)}</Text>
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
                      <Text style={{ color: "#B1AEBC", fontSize: 12, fontFamily: typography.secondary.medium }}>Total Time:</Text>
                      <Text style={[$textLabel, { marginLeft: 5, color: colors.primary, fontFamily: typography.primary.semiBold, fontSize: 12 }]}>03:31</Text>
                    </View>
                  </View>
                  {activeTask &&
                    <ListCardItem
                      tabIndex={selectedTabIndex} isActive={true}
                      member={member}
                      index={1000}
                      item={activeTask as ITeamTask}
                      enableEstimate={false} handleEstimate={() => { }}
                      handleTaskTitle={() => { }}
                    />
                  }
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
                      isActive={false} key={index.toString()}
                      member={member}
                      index={index}
                      item={item as any}
                      enableEstimate={false}
                    />
                  ))}
                </View>
              </View>
            }
            {/* END WORKED TAB CONTENT */}
            {/* ------------------------------------------------------------ */}
            {/* START ASSIGNED TAB CONTENT */}

            {selectedTabIndex === 1 &&
              <View style={{ ...GS.mt2 }}>
                <View>
                  {assignedTasks.map((item, index) => (
                    <ListCardItem
                      tabIndex={selectedTabIndex}
                      member={member}
                      index={index}
                      isActive={false}
                      key={index.toString()}
                      onUnassignTask={hangleUnassignTask}
                      item={item as any}
                      enableEstimate={false}
                    />
                  ))}
                </View>
              </View>
            }

            {/* END ASSIGNED TAB CONTENT */}
            {/* ----------------------------------------------------------------------- */}

            {/* START UNASSIGNED TAB CONTENT */}
            {selectedTabIndex === 2 &&
              <View style={{ ...GS.mt2 }}>
                <View>
                  {unassignedTasks.map((item, index) => (
                    <ListCardItem
                      tabIndex={selectedTabIndex}
                      member={member}
                      index={index}
                      isActive={false}
                      key={index.toString()}
                      onAssignTask={hangleAssignTask}
                      item={item as any} enableEstimate={false}
                    />
                  ))}
                </View>
              </View>
            }
            {/* END UNASSIGNED TAB CONTENT */}

          </ScrollView>
        </Screen>
      </>
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
  fontFamily: typography.primary.semiBold,
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

const $blurContainer: ViewStyle = {
  // flex: 1,
  height: height,
  width: "100%",
  position: "absolute",
  top: 0,
  zIndex: 1001
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
  fontFamily: typography.secondary.medium
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
  fontFamily: typography.primary.semiBold
}
const $tabText: TextStyle = {
  fontFamily: typography.primary.semiBold,
  fontSize: 12,
}
