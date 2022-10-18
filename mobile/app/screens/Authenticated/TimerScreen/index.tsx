import React, { FC } from "react"
import { TextStyle, ViewStyle } from "react-native"

// COMPONENTS
import ActiveTaskCard from "./components/ActiveTaskCard"
import { Button, Screen, Text } from "../../../components"
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"
import TimerCard from "../TimerScreen/components/TimerCard"

// STYLES
import { colors, spacing } from "../../../theme"

export const AuthenticatedTimerScreen: FC<AuthenticatedTabScreenProps<"Timer">> =
  function AuthenticatedTimerScreen(_props) {
    return (
      <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <Text preset="heading" style={$title}>
          Timer
        </Text>

        {/* Active task card */}
        <ActiveTaskCard />

        {/* Timer card */}
        <TimerCard />

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
