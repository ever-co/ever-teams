import React, { FC, useEffect } from "react"
import { TextStyle, ViewStyle, View } from "react-native"

// COMPONENTS
import ActiveTaskCard from "./components/ActiveTaskCard"
import { Button, Screen, Text } from "../../../components"
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"
import TimerCard from "../TimerScreen/components/TimerCard"

// STYLES
import { colors, spacing } from "../../../theme"

// HELPERS
import { api } from "../../../services/api"
import LocalStorage from "../../../services/api/tokenHandler"
import HomeHeader from "../TeamScreen/components/HomeHeader"
import DropDown from "../TeamScreen/components/DropDown"
import NewTimerCard from "./components/NewTimerCard"
import { teams } from "../TeamScreen/data"
import { useStores } from "../../../models"
import Teams, { IOTeams } from "../../../services/teams/organization-team"
import { IOrganizationTeamList } from "../../../services/interfaces/IOrganizationTeam"
import CreateTeamModal from "../TeamScreen/components/CreateTeamModal"
import { getTeamTasksRequest } from "../../../services/requests/tasks"
import { ITeamTask } from "../../../services/interfaces/ITask"
import { getTasksByTeamState } from "../../../services/teams/tasks"


export const AuthenticatedTimerScreen: FC<AuthenticatedTabScreenProps<"Timer">> =
  function AuthenticatedTimerScreen(_props) {
    // Get Authenticate data
    const { authenticationStore: { userId, tenantId, fetchingTasks, fetchingTeams, setFetchingTeams, setFetchingTasks, organizationId, employeeId, activeTeamIdState, authToken } } = useStores();
    // STATE
    const [organizationTeams, setOrganizationTeams] = React.useState<IOTeams>({
      items: [],
      total: 0
    })
    const [teamTasks, setTeamTasks] = React.useState<ITeamTask[]>([]);
    const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false)
    // FUNCTIONS
    const startTimer = async () => {
      // update the local storage
      await LocalStorage.set("timer", { started: true, startTime: new Date().getTime() })

      // start the timer
      const response = await api.commonPostApi(api.routes.startTimer, {})

      console.log("TIMER RESPONSE", response)
    }

    const stopTimer = async () => {
      // update the local storage
      await LocalStorage.set("timer", { started: false, startTime: 0 })

      // stop the timer
      const response = await api.commonPostApi(api.routes.stopTimer, {})

      console.log("TIMER RESPONSE STOP", response)
    }

    // Load teams
    const getTeamsData = async () => {
      const responseTeams = await Teams({
        userId: userId,
        tenantId: tenantId,
        organizationId: organizationId,
        access_token: authToken,
        employeeId,
        method: "GET",
      });
      setOrganizationTeams(responseTeams)
      loadTeamTasks();
    }

    // Create New Team
    const createNewTeam = async (text: string) => {
      const responseTeams = await Teams({
        userId: userId,
        tenantId: tenantId,
        organizationId: organizationId,
        access_token: authToken,
        employeeId,
        method: "POST",
        teamName: text
      });
      setOrganizationTeams(responseTeams)
    }

    const loadTeamTasks = async () => {
      const { data } = await getTeamTasksRequest({
        bearer_token: authToken,
        tenantId: tenantId,
        organizationId: organizationId
      });
      const tasks = getTasksByTeamState({ tasks: data.items, activeTeamId: activeTeamIdState })
      setTeamTasks(tasks);
    }

    useEffect(() => {
      getTeamsData();
    }, [organizationTeams])
    return (
      <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <CreateTeamModal
          onCreateTeam={createNewTeam}
          visible={showCreateTeamModal}
          onDismiss={() => setShowCreateTeamModal(false)}
        />
        <HomeHeader {..._props} />
        <View style={{ paddingBottom: 10 }}>
          <DropDown total={organizationTeams?.total} teams={organizationTeams?.items} onCreateTeam={() => setShowCreateTeamModal(true)} />
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: "#F9FAFB",
            paddingHorizontal: 20,
          }}
        >
          <NewTimerCard tasks={teamTasks} />
        </View>
      </Screen>
    )
  }

const $container: ViewStyle = {
  flex: 1,
}

const $title: TextStyle = {
  marginBottom: spacing.large,
}
