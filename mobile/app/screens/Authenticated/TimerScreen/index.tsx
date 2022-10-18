/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { FC, useEffect } from "react"
import { TextStyle, ViewStyle } from "react-native"

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
    useEffect(() => {
      // startTimer()
      // startTimer();
    }, [])
    return (
      <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <Text preset="heading" style={$title}>
          Timer
        </Text>

        {/* Active task card */}
        <ActiveTaskCard />

        {/* Timer card */}
        <TimerCard
          onTimerStart={() => console.log("starting")}
          onTimerStop={() => console.log("stoping")}
          startTime={1000000}
          totalTime={10000000}
          workedTime={10000}
        />

        {/*  */}
        <Button
          preset="default"
          textStyle={{ color: colors.primary }}
          style={{ borderColor: colors.primary }}
        >
          Estimate now
        </Button>
      </Screen>
    )
  }

const $container: ViewStyle = {
  paddingTop: spacing.extraLarge,
  paddingHorizontal: spacing.large,
}

const $title: TextStyle = {
  marginBottom: spacing.large,
}
