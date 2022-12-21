import React from "react"
import { Image, TextStyle, ViewStyle } from "react-native"
import { BottomTabScreenProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createDrawerNavigator } from '@react-navigation/drawer';
import { CompositeScreenProps } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialCommunityIcons, Feather, SimpleLineIcons, FontAwesome } from "@expo/vector-icons"


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
import HamburgerMenu from "../components/HamburgerMenu";
import HomeHeader from "../screens/Authenticated/TeamScreen/components/HomeHeader";
import { IUser } from "../services/interfaces/IUserData";

export type AuthenticatedTabParamList = {
  Timer: undefined
  Team: undefined
  Profile: { user: IUser }
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

function TabNavigator() {
  const { bottom } = useSafeAreaInsets()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [$tabBar, { height: bottom + 100 }],
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.text,
        tabBarLabelStyle: $tabBarLabel,
        tabBarItemStyle: $tabBarItem,
      }}
    >
      <Tab.Screen
        name="Timer"
        component={AuthenticatedProfileScreen}
        options={{
          tabBarLabel: "Tasks",
          tabBarIcon: ({ focused }) => focused ? <Image source={require("../../assets/icons/new/briefcase-active.png")} /> : <Image source={require("../../assets/icons/new/briefcase.png")} />,
          tabBarActiveTintColor: "#3826A6"
        }}
      />

      <Tab.Screen
        name="Team"
        component={AuthenticatedTeamScreen}
        options={{
          tabBarLabel: "Teams",
          tabBarIcon: ({ focused }) => focused ? <Image source={require("../../assets/icons/new/people-active.png")} /> : <Image source={require("../../assets/icons/new/people.png")} />,
          tabBarActiveTintColor: "#3826A6"
        }}
      />

      <Tab.Screen
        name="Profile"
        component={AuthenticatedTimerScreen}
        options={{
          tabBarLabel: "My Work",
          tabBarIcon: ({ focused }) => <Feather name="user" size={24} color={focused ? "#3826A6" : "#292D32"} />,
          tabBarActiveTintColor: "#3826A6"
        }}
      />
    </Tab.Navigator>
  )
}

const drawer = createDrawerNavigator();


export function AuthenticatedNavigator() {
  return (
    <drawer.Navigator drawerContent={props => <HamburgerMenu {...props} />} screenOptions={{ headerShown: false, drawerPosition: "right" }}>
      <drawer.Screen
        name="AuthenticatedTab" component={TabNavigator} />
    </drawer.Navigator>
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
  fontFamily: typography.fonts.PlusJakartaSans.semiBold,
  lineHeight: 16,
  fontWeight: "500",
  flex: 1,
}

// @demo remove-file
