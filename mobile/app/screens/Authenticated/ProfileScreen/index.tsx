import React, { FC } from "react"
import { Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"

// TYPES
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"

// COMPONENTS
import {  ListItem, Screen, Text } from "../../../components"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../assets/ts/styles"
import { colors, spacing } from ".././../../theme"

export const AuthenticatedProfileScreen: FC<AuthenticatedTabScreenProps<"Profile">> =
  function AuthenticatedProfileScreen(_props) {
    return (
      <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <Text preset="heading" style={$title}>
          Profile
        </Text>

        <View style={{ ...GS.mb5 }}>
          <Image
            source={{
              uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Breezeicons-actions-22-im-user.svg/1200px-Breezeicons-actions-22-im-user.svg.png",
            }}
            style={$userProfile}
          />

          <View>
            <Text preset="heading" size="xl">
              User name
            </Text>
            <Text size="lg">user@evert.tech</Text>
          </View>
        </View>

        <View>
          <ListItem rightIcon="github">Open web project</ListItem>
          <ListItem rightIcon="lock">Privacy & policy</ListItem>
          <ListItem rightIcon="heart">Support us</ListItem>
        </View>
      </Screen>
    )
  }

const $container: ViewStyle = {
  paddingTop: spacing.large + spacing.extraLarge,
  paddingHorizontal: spacing.large,
}

const $title: TextStyle = {
  marginBottom: spacing.large,
}

const $userProfile: ImageStyle = {
  ...GS.roundedFull,
  ...GS.mr2,
  ...GS.borderSm,
  backgroundColor: colors.background,
  width: spacing.huge * 2,
  height: spacing.huge * 2,
}
