import React, { FC, useState } from "react"
import { ImageStyle, ScrollView, TextStyle, View, ViewStyle } from "react-native"

// TYPES
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"
// DATA
import { tasks, teams } from "../TeamScreen/data"

// COMPONENTS
import { Screen, Text } from "../../../components"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../assets/ts/styles"
import { colors, spacing } from ".././../../theme"
import HomeHeader from "../TeamScreen/components/HomeHeader"
import ProfileHeader from "./components/ProfileHeader"
import DropDown from "../TeamScreen/components/DropDown"
import FilterSection from "./components/FilterSection"
import ListCardItem from "./components/ListCardItem"
import HamMenu from "./components/HamMenu"

export const AuthenticatedProfileScreen: FC<AuthenticatedTabScreenProps<"Profile">> =
  function AuthenticatedProfileScreen(_props) {
    const [showHam, setShowHam] = useState(false)

    return (
      <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
        <HomeHeader setShowHam={setShowHam} />
        <ProfileHeader />
        <View style={$wrapComboboxes}>
          <View style={{ flex: 2, alignItems: "flex-start" }}>
            <DropDown teams={teams} onCreateTeam={() => {}} />
          </View>
          <View style={{ width: "30%", justifyContent: "center" }}>
            <FilterSection />
          </View>
        </View>
        <ScrollView
          style={{
            flex: 1,
            zIndex: 999,
            paddingHorizontal: 10,
            paddingBottom: 50,
            backgroundColor: colors.palette.neutral200,
          }}
        >
          <View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}
            >
              <Text style={$textLabel}>Now</Text>
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: "gray" }}>Total Time:</Text>
                <Text style={[$textLabel, { marginLeft: 5 }]}>03:31</Text>
              </View>
            </View>
            <ListCardItem item={tasks[0] as any} enableEstimate={false} />
          </View>
          <View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 15 }}
            >
              <Text style={$textLabel}>Last 24 hours</Text>
              <View style={{ flexDirection: "row" }}>
                <Text style={{ color: "gray" }}>Total Time:</Text>
                <Text style={[$textLabel, { marginLeft: 5 }]}>03:31</Text>
              </View>
            </View>
            {tasks.map((item, index) => (
              <ListCardItem key={index.toString()} item={item as any} enableEstimate={false} />
            ))}
          </View>
        </ScrollView>
        {showHam && <HamMenu setShowHam={setShowHam} />}
      </Screen>
    )
  }

const $container: ViewStyle = {
  flex: 1,
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

const $textLabel: TextStyle = {
  color: colors.primary,
  fontWeight: "700",
}

const $wrapComboboxes: ViewStyle = {
  zIndex: 1000,
  width: "100%",
  flexDirection: "row",
  paddingBottom: 10,
  paddingHorizontal: 10,
  backgroundColor: colors.palette.neutral200,
  justifyContent: "space-between",
}
