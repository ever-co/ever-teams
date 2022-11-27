import React from "react"
import { TextStyle, ViewStyle } from "react-native"
import { BottomTabScreenProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createDrawerNavigator } from '@react-navigation/drawer';
import { CompositeScreenProps } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons"

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

function TabNavigator() {
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
          tabBarLabel: "",
          tabBarIcon: () => <MaterialCommunityIcons name="clock" size={25} color="#1B005D" />,
        }}
      />

      <Tab.Screen
        name="Team"
        component={AuthenticatedTeamScreen}
        options={{
          tabBarLabel: "",
          tabBarIcon: () => <Icon icon="community" color={"#1B005D"} />,
        }}
      />

      <Tab.Screen
        name="Profile"
        component={AuthenticatedProfileScreen}
        options={{
          tabBarLabel: "",
          tabBarIcon: ({ focused }) => <Icon icon="clipApprove" color={focused && colors.tint} />,
        }}
      />
    </Tab.Navigator>
  )
}

const drawer=createDrawerNavigator();


export function AuthenticatedNavigator(){
  return(
    <drawer.Navigator drawerContent={props => <HamburgerMenu {...props} />} screenOptions={{ headerShown: false}}>
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
  fontFamily: typography.primary.medium,
  lineHeight: 16,
  flex: 1,
}

// @demo remove-file
