import React, { useEffect, useState } from "react"
import { Image, TextStyle, View, ViewStyle, Text } from "react-native"
import { BottomTabScreenProps, createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createDrawerNavigator, DrawerScreenProps } from '@react-navigation/drawer';
import { CompositeScreenProps } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Feather } from "@expo/vector-icons"


// COMPONENTS
import { AppStackParamList, AppStackScreenProps } from "./AppNavigator"
import {
  AuthenticatedProfileScreen,
  AuthenticatedTeamScreen,
  AuthenticatedTimerScreen,
  AuthenticatedSettingScreen,
  TaskStatusScreen,
  TaskLabelScreen,
  TaskSizeScreen,
  TaskPriorityScreen
} from "../screens"

// HELPERS
import { translate } from "../i18n"
import { spacing, typography } from "../theme"
import HamburgerMenu from "../components/HamburgerMenu";
import { useAppTheme } from "../app";
import { Skeleton } from "react-native-skeletons";
import { useStores } from "../models";
import { observer } from "mobx-react-lite";

export type AuthenticatedTabParamList = {
  Timer: undefined
  Team: undefined
  Profile: { userId: string, tabIndex: number }
}

export type AuthenticatedDrawerParamList = {
  Setting: undefined,
  AuthenticatedTab: undefined
  TaskLabelScreen: undefined
  TaskSizeScreen: undefined
  TaskStatus: undefined
  TaskPriority: undefined
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

export type AuthenticatedDrawerScreenProps<T extends keyof AuthenticatedDrawerParamList> =
  CompositeScreenProps<
    DrawerScreenProps<AuthenticatedDrawerParamList, T>,
    AppStackScreenProps<keyof AppStackParamList>
  >

const Tab = createBottomTabNavigator<AuthenticatedTabParamList>()

const TabNavigator = observer(function TabNavigator() {
  const { bottom } = useSafeAreaInsets()
  const { colors, dark } = useAppTheme();
  const { teamStore: { isTrackingEnabled } } = useStores()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 3000)
  }, [])

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [{ backgroundColor: dark ? "#1E2025" : colors.background }, { height: bottom + 60 }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tertiary,
        tabBarLabelStyle: $tabBarLabel,
        tabBarItemStyle: $tabBarItem,
        ...isLoading ? {
          tabBarButton: () => (
            <View style={{ width: "100%", flexDirection: "row", justifyContent: isTrackingEnabled ? "space-between" : "space-around", paddingVertical: 25 }}>
              <View style={{ width: "30%", alignItems: "center" }}>
                <Skeleton height={24} width={24} borderRadius={12} style={{ marginBottom: 13 }} />
                <Skeleton height={8} width={63} borderRadius={30} />
              </View>
              <View style={{ width: "30%", alignItems: "center" }}>
                <Skeleton height={24} width={24} borderRadius={12} style={{ marginBottom: 13 }} />
                <Skeleton height={8} width={63} borderRadius={30} />
              </View>
              {isTrackingEnabled ?
                <View style={{ width: "30%", alignItems: "center" }}>
                  <Skeleton height={24} width={24} borderRadius={12} style={{ marginBottom: 13 }} />
                  <Skeleton height={8} width={63} borderRadius={30} />
                </View> : null}
            </View>)
        } : null

      }}
      initialRouteName="Team"
    >
      <Tab.Screen
        name="Profile"
        component={AuthenticatedProfileScreen}
        options={{
          tabBarLabel: translate("tasksScreen.name"),
          tabBarIcon: ({ focused }) => focused ?
            <Image source={!dark ? require("../../assets/icons/new/briefcase-active.png") : require("../../assets/icons/new/briefcase-active-dark.png")} />
            : <Image source={require("../../assets/icons/new/briefcase.png")} />,
          tabBarActiveTintColor: dark ? "#8C7AE4" : "#3826A6"
        }}
      />

      <Tab.Screen
        name="Team"
        component={AuthenticatedTeamScreen}
        options={{
          tabBarLabel: translate("teamScreen.name"),
          tabBarIcon: ({ focused }) => !focused ?
            <Image source={require("../../assets/icons/new/people.png")} />
            : <Image source={!dark ? require("../../assets/icons/new/people-active.png") : require("../../assets/icons/new/people-active-dark.png")} />,
          tabBarActiveTintColor: dark ? "#8C7AE4" : "#3826A6"
        }}
      />
      {isTrackingEnabled ?
        <Tab.Screen
          name="Timer"
          component={AuthenticatedTimerScreen}
          options={{
            tabBarLabel: translate("myWorkScreen.name"),
            tabBarIcon: ({ focused }) => !dark ? <Feather name="user" size={24} color={focused ? "#3826A6" : "#292D32"} /> : <Feather name="user" size={24} color={focused ? "#8C7AE4" : "#292D32"} />,
            tabBarActiveTintColor: dark ? "#8C7AE4" : "#3826A6"
          }}
        /> : null}
    </Tab.Navigator>
  )
})

const drawer = createDrawerNavigator<AuthenticatedDrawerParamList>();


export const AuthenticatedNavigator = observer(function AuthenticatedNavigator() {
  return (
    <drawer.Navigator drawerContent={props => <HamburgerMenu {...props} />} screenOptions={{ headerShown: false, drawerPosition: "right" }}>
      <drawer.Screen
        name="AuthenticatedTab" component={TabNavigator} />
      <drawer.Screen
        name="Setting" component={AuthenticatedSettingScreen} />
      <drawer.Screen
        name="TaskStatus" component={TaskStatusScreen} />
      <drawer.Screen
        name="TaskLabelScreen" component={TaskLabelScreen} />
      <drawer.Screen
        name="TaskSizeScreen" component={TaskSizeScreen} />
      <drawer.Screen
        name="TaskPriority" component={TaskPriorityScreen} />
    </drawer.Navigator>
  )
})




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
