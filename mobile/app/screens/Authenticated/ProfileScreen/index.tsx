import React, { FC } from "react"
import { Image, ImageStyle, ScrollView, TextStyle, View, ViewStyle } from "react-native"

// TYPES
import { AuthenticatedTabScreenProps } from "../../../navigators/AuthenticatedNavigator"
// DATA
import { data, team } from "../TeamScreen/data"

// COMPONENTS
import { ListItem, Screen, Text } from "../../../components"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../../assets/ts/styles"
import { colors, spacing } from ".././../../theme"
import HomeHeader from "../TeamScreen/components/HomeHeader"
import ProfileHeader from "./components/ProfileHeader"
import DropDown from "../TeamScreen/components/DropDown"
import FilterSection from "./components/FilterSection"
import ListCardItem from "./components/ListCardItem"

export const AuthenticatedProfileScreen: FC<AuthenticatedTabScreenProps<"Profile">> =
  function AuthenticatedProfileScreen(_props) {
    return (
      <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
        {/* <View style={{height:'30%', backgroundColor:'red'}}> */}
          <HomeHeader />
        {/* </View> */}
        <ProfileHeader />
        <View
          style={{
            width: "100%",
            flexDirection: "row",
            paddingBottom: 10,
            backgroundColor:colors.palette.neutral200,
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, justifyContent: "center" }}>
            <DropDown teams={data} onCreateTeam={() => {}} />
          </View>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <FilterSection />
          </View>
        </View>
        <ScrollView style={{ padding: 10, backgroundColor:colors.palette.neutral200 }}>
          {team.map((item, index) => (
            <ListCardItem key={index.toString()} item={item as any} enableEstimate={false} />
          ))}
        </ScrollView>
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
