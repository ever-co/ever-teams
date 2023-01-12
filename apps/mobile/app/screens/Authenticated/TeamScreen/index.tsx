import React, { FC, useEffect, useState } from "react"
import {
  ScrollView,
  View,
  TouchableOpacity,
  ViewStyle,
  TouchableWithoutFeedback,
  TextStyle,
  Text, Dimensions, FlatList
} from "react-native"

// TYPES
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"

// COMPONENTS
import { Screen, } from "../../../components"
import InviteUserModal from "./components/InviteUserModal"
import ListCardItem from "./components/ListCardItem"


// STYLES
import { GLOBAL_STYLE as GS } from "../../../../assets/ts/styles"
import { spacing, typography } from "../../../theme"
import HomeHeader from "./components/HomeHeader"
import DropDown from "../../../components/TeamDropdown/DropDown"
import CreateTeamModal from "./components/CreateTeamModal"
import { useStores } from "../../../models"
import { observer } from "mobx-react-lite"
import { IUser } from "../../../services/interfaces/IUserData"
import InviteCardItem from "./components/InviteCardItem"
import FlashMessage from "react-native-flash-message"
import { BlurView } from "expo-blur"
import { useOrganizationTeam } from "../../../services/hooks/useOrganization"
import { translate } from "../../../i18n"
import { useAppTheme } from "../../../app"


const { width, height } = Dimensions.get("window");
export const AuthenticatedTeamScreen: FC<AuthenticatedTabScreenProps<"Team">> = observer(
  function AuthenticatedTeamScreen(_props) {

    const { colors, dark } = useAppTheme();
    //Get authentificate data
    const {
      authenticationStore: { user, tenantId, organizationId, authToken, employeeId },
      teamStore: { teams, createTeam, activeTeam, teamInvitations },
      TaskStore: { activeTask },
      TimerStore: {
        localTimerStatus
      }
    } = useStores();

    const { $otherMembers, isTeamManager, currentUser } = useOrganizationTeam();
    // STATES
    const [taskList] = React.useState(["success", "danger", "warning"])
    const [showMoreMenu, setShowMoreMenu] = React.useState(false)
    const [showInviteModal, setShowInviteModal] = React.useState(false)
    const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false)

    const { navigation } = _props

    function goToProfile({ userId, tabIndex }: { userId: string, tabIndex: number }) {
      navigation.navigate("Profile", { userId, tabIndex })
    }


    // Create New Team
    const createNewTeam = async (text: string) => {
      const responseTeams = {
        tenantId: tenantId,
        organizationId: organizationId,
        access_token: authToken,
        employeeId,
        userId: user?.id,
        teamName: text
      };
      createTeam(responseTeams)
    }



    return (
      <>
        {showInviteModal && <BlurView tint="dark" intensity={18} style={$blurContainer} />}
        <Screen contentContainerStyle={[$container, { backgroundColor: colors.background }]}
          backgroundColor={dark ? "rgb(16,17,20)" : colors.background}
          statusBarStyle="light" StatusBarProps={{ backgroundColor: 'black' }} safeAreaEdges={["top"]}>
          <InviteUserModal visible={showInviteModal} onDismiss={() => setShowInviteModal(false)} />
          <CreateTeamModal
            onCreateTeam={createNewTeam}
            visible={showCreateTeamModal}
            onDismiss={() => setShowCreateTeamModal(false)}
          />
          <HomeHeader props={_props} showTimer={localTimerStatus.running} />
          <View style={{ ...$wrapTeam, backgroundColor: dark ? "#191A20" : "rgba(255,255,255,0.6)", }}>
            <View style={{ width: isTeamManager ? width / 1.9 : "100%" }}>
              <DropDown onCreateTeam={() => setShowCreateTeamModal(true)} />
            </View>
            {isTeamManager ? (
              <TouchableOpacity
                style={[$inviteButton, { borderColor: colors.secondary }]}
                onPress={() => setShowInviteModal(true)}
              >
                <Text style={[$inviteButtonText, { color: colors.secondary }]}>
                  {translate("teamScreen.inviteButton")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableWithoutFeedback onPressIn={() => setShowMoreMenu(false)}>
            {/* Users activity list */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ ...GS.py2, ...GS.px1 }}
              style={[$cardContainer, { backgroundColor: dark ? "rgb(16,17,20)" : "#F7F7F8" }]}
            >
              <View >
                {currentUser && (
                  <ListCardItem
                    member={currentUser as IUser}
                    onPressIn={goToProfile}
                    enableEstimate={false}
                    index={7}
                    userStatus={"online"}
                  />
                )}


                {$otherMembers.map((member, index) => (
                  <ListCardItem
                    key={index}
                    member={member as IUser}
                    onPressIn={goToProfile}
                    enableEstimate={false}
                    index={9}
                    userStatus={"online"}
                  />
                ))}

                {["teamInvitations.items"]?.map((invite: any) => (
                  <InviteCardItem key={"invite.id"} invite={{ fullName: "Elvis Matondo" }} />
                ))}
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
          <FlashMessage position="bottom" />
        </Screen>
      </>
    )
  })

const $container: ViewStyle = {
  ...GS.flex1,
}

const $cardContainer: ViewStyle = {
  ...GS.flex1,
  paddingHorizontal: spacing.medium,
}
const $blurContainer: ViewStyle = {
  // flex: 1,
  height: height,
  width: "100%",
  position: "absolute",
  top: 0,
  zIndex: 1001
}

const $inviteButton: ViewStyle = {
  width: width / 3,
  height: 52,
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderRadius: 10,
  borderWidth: 2,
  justifyContent: "center",
  alignItems: "center"
}
const $inviteButtonText: TextStyle = {
  fontSize: 14,
  fontFamily: typography.fonts.PlusJakartaSans.semiBold,
  color: "#3826A6"
}

const $wrapTeam: ViewStyle = {
  flexDirection: "row",
  width: "100%",
  padding: 20,
  justifyContent: "space-between",
  alignItems: "center",
  zIndex: 999
}