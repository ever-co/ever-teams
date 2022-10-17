import React, { FC } from "react"
import { ScrollView, View, TouchableOpacity, ViewStyle } from "react-native"

// TYPES
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"

// COMPONENTS
import { Button, Icon, Screen, Text } from "../../../components"
import ListCardItem from "./components/ListCardItem"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../assets/ts/styles"
import { colors, spacing } from "../../../theme"

export const AuthenticatedTeamScreen: FC<AuthenticatedTabScreenProps<"Team">> =
  function AuthenticatedTeamScreen(_props) {
    const [taskList] = React.useState(["success", "danger", "warning"])

    return (
      <Screen contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <View style={{ ...GS.inlineItems, ...GS.mb2 }}>
          <View style={{ ...GS.flex1 }}>
            <Text preset="subheading" size="xl">Team / GauzyT</Text>
            <Text preset="subheading">
              Member{taskList.length > 1 ? "s" : ""}: {taskList.length}
            </Text>
          </View>

          <View style={{ ...GS.inlineItems }}>
            <View style={{ ...$headerIconContainer, ...GS.mr2 }}>
              <TouchableOpacity style={{ ...GS.p2 }}>
                <Icon icon="components" />
              </TouchableOpacity>
            </View>

            <View style={$headerIconContainer}>
              <TouchableOpacity style={{ ...GS.p2 }}>
                <Icon icon="more" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Users activity list */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ ...GS.py2, ...GS.px1 }}
          style={{ ...GS.my2 }}
        >
          {taskList.map((item, index) => (
            <ListCardItem key={index.toString()} variant={item as any} />
          ))}

          <ListCardItem variant="danger" />

          <ListCardItem variant="warning" />
        </ScrollView>

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
  ...GS.flex1,
  paddingTop: spacing.extraLarge,
  paddingHorizontal: spacing.large,
}

const $headerIconContainer = {
  ...GS.roundedFull,
  ...GS.shadowSm,
  backgroundColor: colors.background,
}
