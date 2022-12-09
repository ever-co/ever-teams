import React, { FC, useState } from "react"
import { ImageStyle, ScrollView, TextStyle, View, ViewStyle } from "react-native"

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
import DropDown from "../TeamScreen/components/DropDown"
import FilterSection from "./components/FilterSection"
import ListCardItem from "./components/ListCardItem"
import HamburgerMenu from "../../../components/HamburgerMenu"
import AssignTaskSection from "./components/AssignTaskSection"
import { useStores } from "../../../models"
import { ITeamTask } from "../../../services/interfaces/ITask"
import { observer } from "mobx-react-lite"

export const AuthenticatedProfileScreen: FC<AuthenticatedTabScreenProps<"Profile">> = observer(
  function AuthenticatedProfileScreen(_props) {
    const { authenticationStore: { user },
      teamStore: { activeTeam },
      TaskStore: { teamTasks, activeTask }
    } = useStores();
    const [showHam, setShowHam] = useState(false)

    const { params } = _props.route;
    const memberInfo = params?.user || user;

    const members = activeTeam?.members || [];
    const currentUser = members.find((m) => {
      return m.employee.userId === memberInfo.id;
    });
    const member =
      user?.id === memberInfo.id ? user : currentUser?.employee.user;


    const otherTasks = teamTasks
      ? teamTasks.filter((t) => t.id !== activeTask.id)
      : teamTasks;

    return (
      <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <HomeHeader {..._props} />
        <ProfileHeader {...memberInfo} />
        <View style={{ zIndex: 1000 }}>
          <AssignTaskSection />
        </View>
        <View style={$wrapComboboxes}>
          <View style={{ flex: 2, marginHorizontal: -15 }}>
            <DropDown onCreateTeam={() => { }} />
          </View>
          <View style={{ marginRight: 10 }}>
            <FilterSection />
          </View>
        </View>
        <ScrollView
          style={{
            flex: 1,
            zIndex: 998,
            paddingHorizontal: 10,
            paddingBottom: 50,
            backgroundColor: colors.palette.neutral200,
          }}
        >
          <View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}
            >
              <Text style={$textLabel}>Now</Text>
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: "gray" }}>Total Time:</Text>
                <Text style={[$textLabel, { marginLeft: 5 }]}>03:31</Text>
              </View>
            </View>
            {activeTask.id &&
              <ListCardItem item={activeTask as ITeamTask} enableEstimate={false} />}
          </View>
          <View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}
            >
              <Text style={$textLabel}>Last 24 hours</Text>
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: "gray" }}>Total Time:</Text>
                <Text style={[$textLabel, { marginLeft: 5 }]}>03:31</Text>
              </View>
            </View>
            {otherTasks.map((item, index) => (
              <ListCardItem key={index.toString()} item={item as any} enableEstimate={false} />
            ))}
          </View>
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
