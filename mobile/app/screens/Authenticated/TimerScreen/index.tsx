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

export const AuthenticatedTimerScreen: FC<AuthenticatedTabScreenProps<"Timer">> =
  function AuthenticatedTimerScreen(_props) {
    // STATE
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
    useEffect(() => {
      // startTimer()
      // startTimer();
    }, [])
    return (
      <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <HomeHeader />
        <View style={{ paddingBottom: 10 }}>
          <DropDown teams={teams} onCreateTeam={() => {}} />
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
  }

const $container: ViewStyle = {
  flex: 1,
}

const $title: TextStyle = {
  marginBottom: spacing.large,
}
