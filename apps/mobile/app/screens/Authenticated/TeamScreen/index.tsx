import React, { FC, useEffect } from "react"
import {
  ScrollView,
  View,
  TouchableOpacity,
  StatusBar,
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
import { useStores } from "../../../models"
import Teams, { IOTeams} from "../../../services/teams/organization-team"
import { observer } from "mobx-react-lite"


export const AuthenticatedTeamScreen: FC<AuthenticatedTabScreenProps<"Team">> =observer(
  function AuthenticatedTeamScreen(_props) {

    //Get authentificate data
    const { 
      authenticationStore: { userId, tenantId, organizationId, authToken, employeeId },
      teamStore:{teams, createTeam}
     } = useStores();
   
    // STATES
    const [taskList] = React.useState(["success", "danger", "warning"])
    const [showMoreMenu, setShowMoreMenu] = React.useState(false)
    const [showInviteModal, setShowInviteModal] = React.useState(false)
    const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false)

    const { navigation } = _props

    function goToProfile() {
      navigation.navigate("Profile")
    }


    // Create New Team
    const createNewTeam = async (text: string) => {
      const responseTeams = {
        tenantId: tenantId,
        organizationId: organizationId,
        access_token: authToken,
        employeeId,
        userId: userId,
        teamName: text
      };
      createTeam(responseTeams)

    }

    return (
      <Screen contentContainerStyle={$container} statusBarStyle="light" StatusBarProps={{ backgroundColor: 'black' }} safeAreaEdges={["top"]}>
        <InviteUserModal visible={showInviteModal} onDismiss={() => setShowInviteModal(false)} />
        <CreateTeamModal
          onCreateTeam={createNewTeam}
          visible={showCreateTeamModal}
          onDismiss={() => setShowCreateTeamModal(false)}
        />
        <HomeHeader {..._props} />
        <DropDown  onCreateTeam={() => setShowCreateTeamModal(true)} />
        <TouchableWithoutFeedback onPressIn={() => setShowMoreMenu(false)}>
          <View style={$cardContainer}>
            {/* Users activity list */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ ...GS.py2, ...GS.px1 }}
              style={{ ...GS.my2 }}
            >
              {tasks.map((item, index) => (
                <ListCardItem
                  key={index.toString()}
                  item={item as any}
                  onPressIn={() => goToProfile()}
                  enableEstimate={false}
                />
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
  })

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
