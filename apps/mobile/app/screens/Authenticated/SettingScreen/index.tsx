import React, { FC, useEffect, useState } from "react";
import { View, ScrollView, Text, ViewStyle, TextStyle } from "react-native";
import { Screen } from "../../../components";
import { useStores } from "../../../models";
import { AuthenticatedDrawerScreenProps } from "../../../navigators/AuthenticatedNavigator";
import { colors, typography } from "../../../theme";
import PictureSection from "./components/PictureSection";
import SectionTab, { ISectionTabs } from "./components/SectionTab";
import SettingHeader from "./components/SettingHeader";
import SingleInfo from "./components/SingleInfo";


export const AuthenticatedSettingScreen: FC<AuthenticatedDrawerScreenProps<"Setting">> = function AuthenticatedDrawerScreen(_props) {
    const {
        authenticationStore: { user },
        teamStore: { activeTeam }
    } = useStores();

    const [activeTab, setActiveTab] = useState<ISectionTabs>("Personal")


    return (
        <Screen preset="scroll" contentContainerStyle={$container} safeAreaEdges={["top"]}>
            <View style={$headerContainer}>
                <SettingHeader {..._props} />
                <SectionTab activeTab={activeTab} toggleTab={setActiveTab} />
            </View>
            <ScrollView>
                {activeTab === "Personal" ?
                    // PERSONAL SECTION CONTENT STARTS HERE
                    <View style={$contentContainer}>
                        <PictureSection
                            imageUrl={user?.imageUrl}
                            buttonLabel={"Change Avatar"}
                            onDelete={() => { }}
                            onChange={() => { }}
                        />
                        <SingleInfo title="Full Name" value={user?.name} />
                        <SingleInfo title="Your Contact" value={"Your contact information"} />
                        <SingleInfo title="Themes" value={"Light Mode to Dark Mode"} />
                        <SingleInfo title="Languange" value={"English ( United States )"} />
                        <SingleInfo title="Time Zone" value={"Eastern Time Zone (UTC-05:00)"} />
                        <SingleInfo title="Work Schedule" value={"Set your work schedule now"} />

                        <View style={$dangerZoneContainer}>
                            <Text style={$dangerZoneTitle}>Danger Zone</Text>
                            <SingleInfo title="Remove Account" value={"Account will be removed from all teams, except where you are the only manager"} />
                            <SingleInfo title="Delete Account" value={"Your account will be deleted permanently with remolving from all teams"} />
                        </View>
                    </View>
                    // PERSONAL SECTION CONTENT ENDS HERE
                    :
                    // TEAM SECTION CONTENT STARTS HERE
                    <View style={$contentContainer}>
                        <PictureSection
                            imageUrl={""}
                            buttonLabel={"Change Logo"}
                            onDelete={() => { }}
                            onChange={() => { }}
                        />
                        <SingleInfo title="Team Name" value={activeTeam?.name} />
                        <SingleInfo title="Time Tracking" value={"Enable time tracking"} />
                        <SingleInfo title="Task Statuses" value={"there are 7 active statuses"} />
                        <SingleInfo title="Task Priorities" value={"there are 4 active priorities"} />
                        <SingleInfo title="Task Sizes" value={"there are 5 active sizes"} />
                        <SingleInfo title="Task Label" value={"there are 8 active label"} />
                        <SingleInfo title="Manager Member & Role" value={"No"} />
                        <SingleInfo title="Work Schedule" value={"Set your work schedule now"} />

                        <View style={$dangerZoneContainer}>
                            <Text style={$dangerZoneTitle}>Danger Zone</Text>
                            <SingleInfo title="Transfer Ownership" value={"Transfer full ownership of team to another user"} />
                            <SingleInfo title="Remove Team" value={"Team will be completely removed for the system and team members lost access"} />
                            <SingleInfo title="Quit the team" value={"You are about to quit the team"} />
                        </View>
                    </View>
                    // TEAM SECTION CONTENT ENDS HERE
                }
            </ScrollView>
        </Screen>
    )
}

const $container: ViewStyle = {
    flex: 1,
    paddingBottom: 50
}

const $headerContainer: ViewStyle = {
    backgroundColor: colors.background,
    padding: 20,
    paddingBottom: 32,
    shadowColor: "rgba(0, 0, 0, 0.6)",
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 1.00,
    elevation: 1,
    zIndex: 10
}

const $contentContainer: ViewStyle = {
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 40,
    backgroundColor: "#fff",
}

const $dangerZoneContainer: ViewStyle = {
    borderTopColor: "rgba(0, 0, 0, 0.09)",
    borderTopWidth: 1,
    paddingTop: 32,
    marginTop: 32
}
const $dangerZoneTitle: TextStyle = {
    color: "#DA5E5E",
    fontSize: 20,
    fontFamily: typography.primary.semiBold
}