import React from "react"
import { TextStyle, ViewStyle } from "react-native"
import { BottomTabScreenProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { CompositeScreenProps } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

// COMPONENTS
import { Icon } from "../components"
import { AppStackParamList, AppStackScreenProps } from "./AppNavigator"
import {
  AuthenticatedProfileScreen,
  AuthenticatedTeamScreen,
  AuthenticatedTimerScreen,
} from "../screens"

// HELPERS
// import { translate } from "../i18n"
import { colors, spacing, typography } from "../theme"

export type AuthenticatedTabParamList = {
  Timer: undefined
  Team: undefined
  Profile: undefined
}

/**
 * Helper for automatically generating navigation prop types for each route.
 *
 * More info: https://reactnavigation.org/docs/typescript/#organizing-types
 */
export type AuthenticatedTabScreenProps<T extends keyof AuthenticatedTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<AuthenticatedTabParamList, T>,
    AppStackScreenProps<keyof AppStackParamList>
  >

const Tab = createBottomTabNavigator<AuthenticatedTabParamList>()

export function AuthenticatedNavigator() {
  const { bottom } = useSafeAreaInsets()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [$tabBar, { height: bottom + 70 }],
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.text,
        tabBarLabelStyle: $tabBarLabel,
        tabBarItemStyle: $tabBarItem,
      }}
    >
      <Tab.Screen
        name="Timer"
        component={AuthenticatedTimerScreen}
        options={{
          tabBarLabel: "Timer",
          tabBarIcon: ({ focused }) => <Icon icon="bell" color={focused && colors.tint} />,
        }}
      />

      <Tab.Screen
        name="Team"
        component={AuthenticatedTeamScreen}
        options={{
          tabBarLabel: "Team",
          tabBarIcon: ({ focused }) => <Icon icon="community" color={focused && colors.tint} />,
        }}
      />

      <Tab.Screen
        name="Profile"
        component={AuthenticatedProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => <Icon icon="settings" color={focused && colors.tint} />,
        }}
      />
    </Tab.Navigator>
  )
}

const $tabBar: ViewStyle = {
  backgroundColor: colors.background,
  borderTopColor: colors.transparent,
}

const $tabBarItem: ViewStyle = {
  paddingTop: spacing.medium,
}

const $tabBarLabel: TextStyle = {
  fontSize: 12,
  fontFamily: typography.primary.medium,
  lineHeight: 16,
  flex: 1,
}

// @demo remove-file
