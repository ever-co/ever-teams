import React, { FC, useEffect, useState } from "react"
import {
  ScrollView,
  View,
  TouchableOpacity,
  StatusBar,
  ViewStyle,
  TouchableWithoutFeedback,
  TextStyle,
  Text, Dimensions
} from "react-native"

// TYPES
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"

// COMPONENTS
import { Button, Icon, ListItem, Screen, } from "../../../components"
import InviteUserModal from "./components/InviteUserModal"
import ListCardItem from "./components/ListCardItem"
import NewTeamModal from "./components/CreateTeamModal"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../assets/ts/styles"
import { colors, spacing, typography } from "../../../theme"
import HomeHeader from "./components/HomeHeader"
import DropDown from "../../../components/TeamDropdown/DropDown"
import { teams, tasks } from "./data"
import CreateTeamModal from "./components/CreateTeamModal"
import { useStores } from "../../../models"
import Teams, { IOTeams } from "../../../services/teams/organization-team"
import { observer } from "mobx-react-lite"
import { IInvitation, IInviteRequest } from "../../../services/interfaces/IInvite"
import { IUser } from "../../../services/interfaces/IUserData"
import InviteCardItem from "./components/InviteCardItem"
import FlashMessage from "react-native-flash-message"

const { width, height } = Dimensions.get("window");
export const AuthenticatedTeamScreen: FC<AuthenticatedTabScreenProps<"Team">> = observer(
  function AuthenticatedTeamScreen(_props) {

    //Get authentificate data
    const {
      authenticationStore: { user, tenantId, organizationId, authToken, employeeId },
      teamStore: { teams, createTeam, activeTeam, teamInvitations },
      TaskStore: { activeTask }
    } = useStores();

    // STATES
    const [taskList] = React.useState(["success", "danger", "warning"])
    const [showMoreMenu, setShowMoreMenu] = React.useState(false)
    const [showInviteModal, setShowInviteModal] = React.useState(false)
    const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false)
    const [teamManager, setTeamManager] = useState<boolean>(false);

    const members = activeTeam?.members || [];

    const currentUser = members.find((m) => {
      return m.employee.userId === user?.id;
    });

    const $members = members.filter((m) => {
      return m.employee.userId !== user?.id;
    });
    const { navigation } = _props

    function goToProfile(user: IUser) {
      navigation.navigate("Profile", { user: user })
    }


    const isTeamManager = () => {
      if (activeTeam) {
        const $u = user;
        const isM = activeTeam.members.find((member) => {
          const isUser = member.employee.userId === $u?.id;
          return isUser && member.role && member.role.name === "MANAGER";
        });
        setTeamManager(!!isM);
      } else {
        setTeamManager(false);
      }
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



    useEffect(() => {
      isTeamManager();
    }, [activeTeam, user, teams])

    return (
      <Screen contentContainerStyle={$container} statusBarStyle="light" StatusBarProps={{ backgroundColor: 'black' }} safeAreaEdges={["top"]}>
        <InviteUserModal visible={showInviteModal} onDismiss={() => setShowInviteModal(false)} />
        <CreateTeamModal
          onCreateTeam={createNewTeam}
          visible={showCreateTeamModal}
          onDismiss={() => setShowCreateTeamModal(false)}
        />
        <HomeHeader {..._props} />
        <View style={$wrapTeam}>
          <View style={{ width: teamManager ? width / 1.9 : "100%" }}>
            <DropDown onCreateTeam={() => setShowCreateTeamModal(true)} />
          </View>
          {teamManager ? (
            <TouchableOpacity
              style={$inviteButton}
              onPress={()=>setShowInviteModal(true)}
            >
              <Text style={$inviteButtonText}>
                Invite
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableWithoutFeedback onPressIn={() => setShowMoreMenu(false)}>
          <View style={$cardContainer}>
            {/* Users activity list */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ ...GS.py2, ...GS.px1 }}
              style={{ ...GS.my2 }}
            >
              {currentUser && (
                <ListCardItem
                  item={currentUser as any}
                  onPressIn={goToProfile}
                  enableEstimate={false}
                  index={7}
                  userStatus={"online"}
                />
              )}
              {currentUser && (
                <ListCardItem
                  item={currentUser as any}
                  onPressIn={goToProfile}
                  enableEstimate={false}
                  index={8}
                  userStatus={"pause"}
                />
              )}
              {currentUser && (
                <ListCardItem
                  item={currentUser as any}
                  onPressIn={goToProfile}
                  enableEstimate={false}
                  index={9}
                  userStatus={"not working"}
                />
              )}


              {$members.map((member, index) => (
                <ListCardItem
                  key={index}
                  item={member}
                  onPressIn={goToProfile}
                  enableEstimate={false}
                  index={9}
                  userStatus={"online"}
                />
              ))}
              {/* {teamInvitations.items?.map((invite: any) => ( */}
                <InviteCardItem item={{fullName:"Elvis Matondo"}}   />
              {/* ))} */}
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
        <FlashMessage position="bottom" />
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
  backgroundColor: "#F7F7F8",
  paddingHorizontal: spacing.medium,
}
const $inviteButton: ViewStyle = {
  width: width / 3,
  height: 52,
  paddingHorizontal: 12,
  paddingVertical: 10,
  borderRadius: 10,
  borderWidth: 2,
  borderColor: "#3826A6",
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