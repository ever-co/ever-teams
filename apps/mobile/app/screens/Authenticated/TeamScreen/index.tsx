import React, { FC, useEffect, useState } from "react"
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
import Teams, { IOTeams } from "../../../services/teams/organization-team"
import { observer } from "mobx-react-lite"
import { IInviteRequest } from "../../../services/interfaces/IInvite"
import {getTeamInvitations, inviteByEmail} from "../../../services/invite/invite"
import { IUser } from "../../../services/interfaces/IUserData"
import InviteCardItem from "./components/InviteCardItem"


export const AuthenticatedTeamScreen: FC<AuthenticatedTabScreenProps<"Team">> = observer(
  function AuthenticatedTeamScreen(_props) {

    //Get authentificate data
    const {
      authenticationStore: { user, tenantId, organizationId, authToken, employeeId },
      teamStore: { teams, createTeam, activeTeam },
      TaskStore:{activeTask}
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

    function goToProfile() {
      navigation.navigate("Profile")
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

    const onInviteMember = async (inviteData: IInviteRequest) => {
      const response = await inviteByEmail({
        user: user as IUser,
        organizationId: organizationId,
        tenantId: tenantId,
        teamId: activeTeam?.id,
        inviteBody: inviteData,
        access_token: authToken
      })
      setShowInviteModal(false)
      console.log("Data :" + JSON.stringify(response))
    }

    useEffect(() => {
      isTeamManager();
      getTeamInvitations({user,organizationId,access_token:authToken,tenantId, teamId:activeTeam?.id})
    }, [activeTeam, user, teams, activeTask])

    return (
      <Screen contentContainerStyle={$container} statusBarStyle="light" StatusBarProps={{ backgroundColor: 'black' }} safeAreaEdges={["top"]}>
        <InviteUserModal onInviteMember={onInviteMember} visible={showInviteModal} onDismiss={() => setShowInviteModal(false)} />
        <CreateTeamModal
          onCreateTeam={createNewTeam}
          visible={showCreateTeamModal}
          onDismiss={() => setShowCreateTeamModal(false)}
        />
        <HomeHeader {..._props} />
        <DropDown onCreateTeam={() => setShowCreateTeamModal(true)} />
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
                  onPressIn={() => goToProfile()}
                  enableEstimate={false}
                />
              )}

              {$members.map((member, index) => (
                <ListCardItem
                  key={index}
                  item={member}
                  onPressIn={() => goToProfile()}
                  enableEstimate={false}
                />
              ))}

              <InviteCardItem item={{}} />

              {/* Invite btn */}
              {teamManager ? (
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
              ) : null}
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
