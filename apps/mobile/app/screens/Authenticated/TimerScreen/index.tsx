import React, { FC, useEffect } from "react"
import { TextStyle, ViewStyle, View } from "react-native"

// COMPONENTS
import { Screen, Text } from "../../../components"
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"

// STYLES
import { spacing } from "../../../theme"
import { GLOBAL_STYLE as GS } from "../../../../assets/ts/styles"
// HELPERS
import HomeHeader from "../TeamScreen/components/HomeHeader"
import DropDown from "../../../components/TeamDropdown/DropDown"
import { useStores } from "../../../models"
import { IOTeams } from "../../../services/teams/organization-team"
import CreateTeamModal from "../TeamScreen/components/CreateTeamModal"
import { observer } from "mobx-react-lite"
import ManageTaskCard from "../../../components/ManageTaskCard"
import TimerCard from "../../../components/TimerCard"
import { useFirstLoad } from "../../../services/hooks/useFirstLoad"
import { useTeamTasks } from "../../../services/hooks/features/useTeamTasks"
import { useAppTheme } from "../../../app"
import { useTheme } from "react-native-paper"


export const AuthenticatedTimerScreen: FC<AuthenticatedTabScreenProps<"Timer">> = observer(function AuthenticatedTimerScreen(_props) {
  // HOOKS
  const { firstLoadData, firstLoad } = useFirstLoad();
  const { loadTeamTasksData } = useTeamTasks();

  // STATES
  const {
    authenticationStore: { user, tenantId, organizationId, employeeId, authToken },
    teamStore: { createTeam },
    TaskStore:{teamTasks, setTeamTasks}
  } = useStores();

  const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false)

  const { colors } = useAppTheme()
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
    firstLoadData();
    loadTeamTasksData();
  }, [])

  return (
    <Screen preset="scroll" contentContainerStyle={[$container, { backgroundColor: colors.background2 }]} safeAreaEdges={["top"]}>
      <CreateTeamModal
        onCreateTeam={createNewTeam}
        visible={showCreateTeamModal}
        onDismiss={() => setShowCreateTeamModal(false)}
      />
      <View style={{ zIndex: 1000 }}>
        <HomeHeader props={_props} showTimer={false} />
      </View>
      <View style={{ padding: 20, zIndex: 999, backgroundColor: colors.background }}>
        <DropDown onCreateTeam={() => setShowCreateTeamModal(true)} />
      </View>
      <View style={[$timerSection, { backgroundColor: colors.background }]}>
        <View style={{ zIndex: 100 }}>
          <ManageTaskCard />
        </View>
        <View style={{ zIndex: 99 }}>
          <TimerCard />
        </View>
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

const $timerSection: ViewStyle = {
  marginTop: 20,
  padding: 20,
  marginHorizontal: 20,
  borderRadius: 16,
  ...GS.noBorder,
  borderWidth: 1,
  elevation: 10,
  shadowColor: "rgba(0, 0, 0, 0.1)",
  shadowOffset: { width: 15, height: 15 },
  shadowOpacity: 1,
  shadowRadius: 16,
}
const $card: ViewStyle = {

}