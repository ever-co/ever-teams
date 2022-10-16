import React, { FC } from "react"
import { TextStyle, View, ViewStyle } from "react-native"

// TYPES
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"

// COMPONENTS
import { Button, Screen, Text } from "../../../components"
import ListCardItem from "./components/ListCardItem"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../assets/ts/styles"
import { colors, spacing } from "../../../theme"

export const AuthenticatedTeamScreen: FC<AuthenticatedTabScreenProps<"Team">> =
  function AuthenticatedTeamScreen(_props) {
    return (
      <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <Text preset="heading" style={$title}>
          Team
        </Text>

        {/* Users activity list */}
        <View style={{ ...GS.my3 }}>
          <ListCardItem variant="success" />

          <ListCardItem variant="danger" />

          <ListCardItem variant="warning" />
        </View>

        {/* Invite btn */}
        <Button
          preset="default"
          textStyle={{ color: colors.palette.primary600 }}
          style={{ ...GS.bgTransparent, ...GS.mb2, borderColor: colors.palette.primary600 }}
        >
          Invite
        </Button>
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
