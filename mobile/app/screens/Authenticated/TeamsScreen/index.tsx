import React, { FC } from "react"
import { TextStyle, View, ViewStyle } from "react-native"

// COMPONENTS
import { Button, Screen, Text, SelectCard } from "../../../components"
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"
import ListCardItem from "./components/ListCardItem"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../assets/ts/styles"
import { colors, spacing } from "../../../theme"
export const AuthenticatedTeamsScreen: FC<AuthenticatedTabScreenProps<"Teams">> =
  function AuthenticatedTeamsScreen(_props) {
    return (
      <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <Text preset="heading" style={$title}>
          Teams
        </Text>

        {/* Active task card */}
        <SelectCard
          label="Active task"
          FooterComponent={
            <Text size="md" weight="bold" style={{ ...GS.ml3 }}>
              Estimated: {40}h:{15}min
            </Text>
          }
        />

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
