import React, { FC } from "react"
import { TextStyle, ViewStyle } from "react-native"

// COMPONENTS
import { Screen, SelectCard, Text } from "../../../components"
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"
import TimerCard from "../TimerScreen/components/TimerCard"

// STYLES
import { spacing } from "../../../theme"

export const AuthenticatedTimerScreen: FC<AuthenticatedTabScreenProps<"Timer">> =
  function AuthenticatedTimerScreen(_props) {
    return (
      <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <Text preset="heading" style={$title}>
          Timer
        </Text>

        <SelectCard label="Select project" />

        {/* Timer card */}
        <TimerCard />

        <Text preset="subheading">Details</Text>
        <Text weight="light">
          Slack | ever_gauzy | Ever - 14 October 2022 Ruslan Konviser ・a day ago Comments There
          aren't any comments yet. Be the first. Add a comment on the video above.
        </Text>
      </Screen>
    )
  }

const $container: ViewStyle = {
  paddingTop: spacing.large + spacing.extraLarge,
  paddingHorizontal: spacing.large,
}

const $title: TextStyle = {
  marginBottom: spacing.small,
}
