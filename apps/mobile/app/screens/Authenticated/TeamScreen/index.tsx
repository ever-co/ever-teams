import React, { FC, useEffect, useState } from "react"
import {
  ScrollView,
  View,
  TouchableOpacity,
  ViewStyle,
  TouchableWithoutFeedback,
  TextStyle,
  Text, Dimensions, FlatList, LogBox
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
import HomeHeader from "../../../components/HomeHeader"
import DropDown from "../../../components/TeamDropdown/DropDown"
import CreateTeamModal from "../../../components/CreateTeamModal"
import { useStores } from "../../../models"
import { observer } from "mobx-react-lite"
import { IUser } from "../../../services/interfaces/IUserData"
import InviteCardItem from "./components/InviteCardItem"
import FlashMessage, { showMessage } from "react-native-flash-message"
import { BlurView } from "expo-blur"
import { useOrganizationTeam } from "../../../services/hooks/useOrganization"
import { translate } from "../../../i18n"
import { useAppTheme } from "../../../app"
import { useTeamInvitations } from "../../../services/hooks/useTeamInvitation"
import useTeamScreenLogic from "./logics/useTeamScreenLogic"
import TeamScreenSkeleton from "./components/TeamScreenSkeleton"


const { width, height } = Dimensions.get("window");
export const AuthenticatedTeamScreen: FC<AuthenticatedTabScreenProps<"Team">> = observer(
  function AuthenticatedTeamScreen(_props) {

    const { colors, dark } = useAppTheme();
    LogBox.ignoreAllLogs();
    //Get authentificate data
    const {
      teamStore: {
        teamInvitations
      },
      TimerStore: {
        localTimerStatus
      }
    } = useStores();

    const { $otherMembers, createOrganizationTeam, isTeamManager, currentUser } = useOrganizationTeam();
    const {
      setShowCreateTeamModal,
      setShowInviteModal,
      showCreateTeamModal,
      showInviteModal,
      showMoreMenu,
      setShowMoreMenu,
      isLoading
    } = useTeamScreenLogic();

    const { navigation } = _props

    function goToProfile({ userId, tabIndex }: { userId: string, tabIndex: number }) {
      navigation.navigate("Profile", { userId, tabIndex })
    }

    return (
      <>
        {showInviteModal && <BlurView tint="dark" intensity={18} style={$blurContainer} />}
        <Screen contentContainerStyle={[$container, { backgroundColor: colors.background }]}
          backgroundColor={dark ? "rgb(16,17,20)" : colors.background}
          statusBarStyle="light" StatusBarProps={{ backgroundColor: 'black' }} safeAreaEdges={["top"]}>
          <InviteUserModal visible={showInviteModal} onDismiss={() => setShowInviteModal(false)} />
          <CreateTeamModal
            onCreateTeam={createOrganizationTeam}
            visible={showCreateTeamModal}
            onDismiss={() => setShowCreateTeamModal(false)}
          />

          {isLoading ? (
            <TeamScreenSkeleton />
          ) : (
            <>
              <HomeHeader props={_props} showTimer={localTimerStatus.running} />
              <View style={{ ...$wrapTeam, backgroundColor: dark ? "#191A20" : "rgba(255,255,255,0.6)", }}>
                <View style={{ width: isTeamManager ? width / 1.9 : "100%" }}>
                  <DropDown resized={isTeamManager} onCreateTeam={() => setShowCreateTeamModal(true)} />
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
                  bounces={false}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ ...GS.px1 }}
                  style={[$cardContainer, { backgroundColor: dark ? "rgb(0,0,0)" : "#F7F7F8" }]}
                >
                  <View>
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
                        userStatus={"pause"}
                      />
                    ))}

                    {teamInvitations.map((invite, idx) => (
                      <InviteCardItem key={idx} invite={invite} />
                    ))}
                  </View>
                </ScrollView>
              </TouchableWithoutFeedback>
              <FlashMessage position="bottom" />
            </>
          )}
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