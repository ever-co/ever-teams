import { ScrollView, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native'
import React from 'react'
import { useAppTheme } from '../../../../app'
import { typography } from '../../../../theme/typography';
import SingleInfo from '../components/SingleInfo';
import { translate } from '../../../../i18n';
import PictureSection from '../components/PictureSection';
import { useStores } from '../../../../models';
import { useOrganizationTeam } from '../../../../services/hooks/useOrganization';
import SwithTimeTracking from '../components/SwitchTimeTracking';


const TeamSettings = (props:any) => {
    const { colors } = useAppTheme();
    const {
        teamStore: { activeTeam }
    } = useStores();
    const { isTeamManager } = useOrganizationTeam()
    const { navigation } = props;


    return (
        <View style={[$contentContainer, { backgroundColor: colors.background, opacity: 0.9 }]}>
            <ScrollView bounces={false} style={{ width: "90%", height: "100%" }} showsVerticalScrollIndicator={false}>
                <PictureSection
                    imageUrl={""}
                    buttonLabel={translate("settingScreen.teamSection.changeLogo")}
                    onDelete={() => { }}
                    onChange={() => { }}
                />
                <SingleInfo title={translate("settingScreen.teamSection.teamName")} value={activeTeam?.name} onPress={() => { }} />
                {isTeamManager ? <SwithTimeTracking /> : null}
                <SingleInfo title={translate("settingScreen.teamSection.taskStatuses")} value={"there are 4 active statuses"} onPress={() => navigation.navigate("TaskStatus")} />
                <SingleInfo title={translate("settingScreen.teamSection.taskPriorities")} value={"there are 4 active priorities"} onPress={() => navigation.navigate("TaskPriority")} />
                <SingleInfo title={translate("settingScreen.teamSection.taskSizes")} value={"there are 5 active sizes"} onPress={() => navigation.navigate("TaskSizeScreen")} />
                <SingleInfo title={translate("settingScreen.teamSection.taskLabel")} value={"there are 8 active label"} onPress={() => navigation.navigate("TaskLabelScreen")} />
                <SingleInfo title={translate("settingScreen.teamSection.teamRole")} value={"No"} />
                <SingleInfo title={translate("settingScreen.teamSection.workSchedule")} value={translate("settingScreen.teamSection.workScheduleHint")} onPress={() => { }} />

                <View style={$dangerZoneContainer}>
                    <Text style={$dangerZoneTitle}>{translate("settingScreen.dangerZone")}</Text>
                    <SingleInfo title={translate("settingScreen.teamSection.transferOwnership")} value={translate("settingScreen.teamSection.transferOwnership")} onPress={() => { }} />
                    <SingleInfo title={translate("settingScreen.teamSection.removeTeam")} value={translate("settingScreen.teamSection.removeTeamHint")} onPress={() => { }} />
                    <SingleInfo title={translate("settingScreen.teamSection.quitTeam")} value={translate("settingScreen.teamSection.quitTeamHint")} onPress={() => { }} />
                </View>

            </ScrollView>
        </View>

    )
}

export default TeamSettings


const $contentContainer: ViewStyle = {
    width: "100%",
    flex: 1,
    alignItems: "center"
}

const $dangerZoneContainer: ViewStyle = {
    borderTopColor: "rgba(0, 0, 0, 0.09)",
    borderTopWidth: 1,
    paddingTop: 32,
    marginTop: 32,
    marginBottom: 40
}
const $dangerZoneTitle: TextStyle = {
    color: "#DA5E5E",
    fontSize: 20,
    fontFamily: typography.primary.semiBold
}
