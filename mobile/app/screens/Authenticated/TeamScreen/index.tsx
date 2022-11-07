import React, { FC } from "react"
import {
  ScrollView,
  View,
  TouchableOpacity,
  ViewStyle,
  TouchableWithoutFeedback,
} from "react-native"

// TYPES
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"

// COMPONENTS
import { Button, Icon, ListItem, Screen, Text } from "../../../components"
import InviteUserModal from "./components/InviteUserModal"
import ListCardItem from "./components/ListCardItem"
import NewTeamModal from "./components/CreateTeamModal"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../assets/ts/styles"
import { colors, spacing } from "../../../theme"
import HomeHeader from "./components/HomeHeader"
import DropDown from "./components/DropDown"
import { teams, tasks } from "./data"
import CreateTeamModal from "./components/CreateTeamModal"


export const AuthenticatedTeamScreen: FC<AuthenticatedTabScreenProps<"Team">> =
  function AuthenticatedTeamScreen(_props) {
    // STATES
    const [taskList] = React.useState(["success", "danger", "warning"])
    const [showMoreMenu, setShowMoreMenu] = React.useState(false)
    const [showInviteModal, setShowInviteModal] = React.useState(false)
    const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false)

  

    return (
      <Screen contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <InviteUserModal visible={showInviteModal} onDismiss={() => setShowInviteModal(false)} />
        <CreateTeamModal visible={showCreateTeamModal} onDismiss={()=>setShowCreateTeamModal(false)} />
        <NewTeamModal
          visible={showCreateTeamModal}
          onDismiss={() => setShowCreateTeamModal(false)}
        />
        <HomeHeader />
        <DropDown teams={teams} onCreateTeam={()=>setShowCreateTeamModal(true)} />
        <TouchableWithoutFeedback onPressIn={() => setShowMoreMenu(false)}>
          <View style={$cardContainer}>
            {/* Users activity list */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ ...GS.py2, ...GS.px1 }}
              style={{ ...GS.my2 }}
            >
              {tasks.map((item, index) => (
                <ListCardItem key={index.toString()} item={item as any} enableEstimate={false} />
              ))}

              {/* Invite btn */}
              <Button
                preset="default"
                textStyle={{ color: colors.palette.neutral100, fontWeight: "bold" }}
                style={{
                  ...GS.bgTransparent,
                  ...GS.mb2,
                  borderColor: colors.primary,
                  backgroundColor: colors.primary,
                }}
                onPress={() => setShowInviteModal(true)}
              >
                Invite
              </Button>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </Screen>
    )
  }

const $container: ViewStyle = {
  ...GS.flex1,
}

const $headerIconContainer = {
  ...GS.roundedFull,
  ...GS.shadowSm,
  backgroundColor: colors.background,
}

const $cardContainer: ViewStyle = {
  ...GS.flex1,
  backgroundColor: colors.palette.neutral200,
  paddingHorizontal: spacing.medium,
  marginTop: spacing.small,
}
