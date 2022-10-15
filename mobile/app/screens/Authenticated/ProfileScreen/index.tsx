import React, { FC } from "react"
import { TextStyle, ViewStyle } from "react-native"

// TYPES
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"

// COMPONENTS
import { Screen, Text } from "../../../components"

// STYLES
import { spacing } from "../../../theme"

export const AuthenticatedProfileScreen: FC<AuthenticatedTabScreenProps<"Profile">> =
  function AuthenticatedProfileScreen(_props) {
    return (
      <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <Text preset="heading" style={$title}>
          Profile
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
