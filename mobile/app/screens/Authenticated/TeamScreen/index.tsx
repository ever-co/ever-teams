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
import NewListCardItem from "./components/NewListCardItem"
import { team } from "./data"

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
        <NewTeamModal
          visible={showCreateTeamModal}
          onDismiss={() => setShowCreateTeamModal(false)}
        />
        <HomeHeader />
        <DropDown />
        <TouchableWithoutFeedback onPressIn={() => setShowMoreMenu(false)}>
          <View style={{ ...GS.flex1 }}>
            {/* Users activity list */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ ...GS.py2, ...GS.px1 }}
              style={{ ...GS.my2 }}
            >
              {taskList.map((item, index) => (
                <ListCardItem key={index.toString()} variant={item as any} />
              ))}
            </ScrollView>

            {/* Invite btn */}
            <Button
              preset="default"
              textStyle={{ color: colors.palette.neutral100 }}
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
          </View>
        </TouchableWithoutFeedback>
      </Screen>
    )
  }

const $container: ViewStyle = {
  ...GS.flex1,
  paddingTop: spacing.extraLarge,
  paddingHorizontal: spacing.large,
}

const $headerIconContainer = {
  ...GS.roundedFull,
  ...GS.shadowSm,
  backgroundColor: colors.background,
}
