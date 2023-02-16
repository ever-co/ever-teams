import React, { FC, useEffect, useState } from "react";
import { View, ScrollView, Text, ViewStyle, TextStyle, Dimensions } from "react-native";
import { Screen } from "../../../components";
import { useStores } from "../../../models";
import { AuthenticatedDrawerScreenProps } from "../../../navigators/AuthenticatedNavigator";
import { typography } from "../../../theme";
import LanguageModal, { ISupportedLanguage, supportedLanguages } from "./components/LanguageModal";
import PictureSection from "./components/PictureSection";
import SectionTab from "./components/SectionTab";
import SettingHeader from "./components/SettingHeader";
import SingleInfo from "./components/SingleInfo";
import { BlurView } from "expo-blur";
import { translate } from "../../../i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppTheme } from "../../../app";
import { observer } from "mobx-react-lite";
import { useNavigation } from "@react-navigation/native";


export const AuthenticatedSettingScreen: FC<AuthenticatedDrawerScreenProps<"Setting">> = function AuthenticatedDrawerScreen(_props) {
    const { colors } = useAppTheme();
    const {
        authenticationStore: { user, toggleTheme },
        teamStore: { activeTeam }
    } = useStores();

    const { navigation } = _props;
    // STATES
    const [activeTab, setActiveTab] = useState(1)
    const [languageModal, setLanguageModal] = useState(false)
    const [lang, setLang] = useState<ISupportedLanguage>(supportedLanguages[2])

    const setLanguageLabel = async () => {
        const localCode = await AsyncStorage.getItem("Language");
        if (!localCode) {
            const language = supportedLanguages.find((l) => l.localeCode === "en");
            setLang(language)
        } else {
            const language = supportedLanguages.find((l) => l.localeCode === localCode);
            setLang(language)
        }
    }

    useEffect(() => {
        setLanguageLabel();
    }, [])
    return (
        <>
            {languageModal && <BlurView tint="dark" intensity={18} style={$blurContainer} />}
            <Screen preset="scroll" ScrollViewProps={{ bounces: false }} contentContainerStyle={[$container, { backgroundColor: colors.background }]} safeAreaEdges={["top"]}>
                <LanguageModal visible={languageModal} currentLanguage={lang.locale} onDismiss={() => setLanguageModal(false)} />
                <View style={[$headerContainer, { backgroundColor: colors.background }]}>
                    <SettingHeader {..._props} />
                    <SectionTab activeTabId={activeTab} toggleTab={setActiveTab} />
                </View>
                <ScrollView bounces={false}>
                    {activeTab === 1 ?
                        // PERSONAL SECTION CONTENT STARTS HERE
                        <View style={[$contentContainer, { backgroundColor: colors.background2 }]}>
                            <PictureSection
                                imageUrl={user?.imageUrl}
                                buttonLabel={translate("settingScreen.personalSection.changeAvatar")}
                                onDelete={() => { }}
                                onChange={() => { }}
                            />
                            <SingleInfo title={translate("settingScreen.personalSection.fullName")} value={user?.name} onPress={() => { }} />
                            <SingleInfo title={translate("settingScreen.personalSection.yourContact")} value={translate("settingScreen.personalSection.yourContactHint")} onPress={() => { }} />
                            <SingleInfo onPress={() => toggleTheme()} title={translate("settingScreen.personalSection.themes")} value={translate("settingScreen.personalSection.lightModeToDark")} />
                            <SingleInfo onPress={() => setLanguageModal(true)} title={translate("settingScreen.personalSection.language")} value={lang.locale} />
                            <SingleInfo title={translate("settingScreen.personalSection.timeZone")} value={"Eastern Time Zone (UTC-05:00)"} onPress={() => { }} />
                            <SingleInfo title={translate("settingScreen.personalSection.workSchedule")} value={translate("settingScreen.personalSection.workScheduleHint")} onPress={() => { }} />

                            <View style={$dangerZoneContainer}>
                                <Text style={$dangerZoneTitle}>{translate("settingScreen.dangerZone")}</Text>
                                <SingleInfo title={translate("settingScreen.personalSection.removeAccount")} value={translate("settingScreen.personalSection.removeAccountHint")} onPress={() => { }} />
                                <SingleInfo title={translate("settingScreen.personalSection.deleteAccount")} value={translate("settingScreen.personalSection.deleteAccountHint")} onPress={() => { }} />
                            </View>
                        </View>
                        // PERSONAL SECTION CONTENT ENDS HERE
                        :
                        // TEAM SECTION CONTENT STARTS HERE
                        <View style={[$contentContainer, { backgroundColor: colors.background2 }]}>
                            <PictureSection
                                imageUrl={""}
                                buttonLabel={translate("settingScreen.teamSection.changeLogo")}
                                onDelete={() => { }}
                                onChange={() => { }}
                            />
                            <SingleInfo title={translate("settingScreen.teamSection.teamName")} value={activeTeam?.name} onPress={() => { }} />
                            <SingleInfo title={translate("settingScreen.teamSection.timeTracking")} value={translate("settingScreen.teamSection.timeTrackingHint")} onPress={() => { }} />
                            <SingleInfo title={translate("settingScreen.teamSection.taskStatuses")} value={"there are 4 active statuses"} onPress={() => navigation.navigate("TaskStatus")} />
                            <SingleInfo title={translate("settingScreen.teamSection.taskPriorities")} value={"there are 4 active priorities"} onPress={() => navigation.navigate("TaskPriority")} />
                            <SingleInfo title={translate("settingScreen.teamSection.taskSizes")} value={"there are 5 active sizes"} onPress={() => { }} />
                            <SingleInfo title={translate("settingScreen.teamSection.taskLabel")} value={"there are 8 active label"} onPress={() => { }} />
                            <SingleInfo title={translate("settingScreen.teamSection.teamRole")} value={"No"} />
                            <SingleInfo title={translate("settingScreen.teamSection.workSchedule")} value={translate("settingScreen.teamSection.workScheduleHint")} onPress={() => { }} />

                            <View style={$dangerZoneContainer}>
                                <Text style={$dangerZoneTitle}>{translate("settingScreen.dangerZone")}</Text>
                                <SingleInfo title={translate("settingScreen.teamSection.transferOwnership")} value={translate("settingScreen.teamSection.transferOwnership")} onPress={() => { }} />
                                <SingleInfo title={translate("settingScreen.teamSection.removeTeam")} value={translate("settingScreen.teamSection.removeTeamHint")} onPress={() => { }} />
                                <SingleInfo title={translate("settingScreen.teamSection.quitTeam")} value={translate("settingScreen.teamSection.quitTeamHint")} onPress={() => { }} />
                            </View>
                        </View>
                        // TEAM SECTION CONTENT ENDS HERE
                    }
                </ScrollView>
            </Screen>
        </>

    )
}

const { height, width } = Dimensions.get("window");

const $container: ViewStyle = {
    flex: 1,
}

const $headerContainer: ViewStyle = {
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

const $blurContainer: ViewStyle = {
    // flex: 1,
    height: height,
    width: "100%",
    position: "absolute",
    top: 0,
    zIndex: 1001
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