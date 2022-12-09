import React, { FC, useEffect } from "react"
import { TextStyle, ViewStyle, View } from "react-native"

// COMPONENTS
import { Screen, Text } from "../../../components"
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"

// STYLES
import { colors, spacing } from "../../../theme"

// HELPERS
import { api } from "../../../services/api"
import LocalStorage from "../../../services/api/tokenHandler"
import HomeHeader from "../TeamScreen/components/HomeHeader"
import DropDown from "../TeamScreen/components/DropDown"
import NewTimerCard from "./components/NewTimerCard"
import { useStores } from "../../../models"
import { IOTeams } from "../../../services/teams/organization-team"
import CreateTeamModal from "../TeamScreen/components/CreateTeamModal"
import { observer } from "mobx-react-lite"


export const AuthenticatedTimerScreen: FC<AuthenticatedTabScreenProps<"Timer">> = observer(function AuthenticatedTimerScreen(_props) {
  // Get Store data
  const {
    authenticationStore: { user, tenantId, organizationId, employeeId, authToken },
    teamStore: { teams, activeTeam, activeTeamId, getUserTeams, createTeam, setActiveTeam },
    TaskStore: { teamTasks, activeTask, activeTaskId, setActiveTask }
  } = useStores();
  // STATE
  const [organizationTeams, setOrganizationTeams] = React.useState<IOTeams>({
    items: [],
    total: 0
  })
  const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false)

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

  const loadTeamTasks = async () => {
    await getUserTeams({ tenantId: tenantId, userId: user?.id, authToken: authToken });
  }


  useEffect(() => {

  }, [])

  return (
    <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
      <CreateTeamModal
        onCreateTeam={createNewTeam}
        visible={showCreateTeamModal}
        onDismiss={() => setShowCreateTeamModal(false)}
      />
      <HomeHeader {..._props} />
      <View style={{ paddingBottom: 10, zIndex:10 }}>
        <DropDown onCreateTeam={() => setShowCreateTeamModal(true)} />
      </View>
      <View
        style={{
          flex: 1,
          backgroundColor: "#F9FAFB",
          paddingHorizontal: 20,
        }}
      >
        <NewTimerCard />
      </View>
    </Screen>
  )
})

const $container: ViewStyle = {
  flex: 1,
}

const $title: TextStyle = {
  marginBottom: spacing.large,
}
