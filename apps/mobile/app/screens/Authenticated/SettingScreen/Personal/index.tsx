import { ScrollView, StyleSheet, Text, TextStyle, TouchableWithoutFeedback, View, ViewStyle } from 'react-native'
import React, { FC, useState } from 'react'
import { useAppTheme } from '../../../../app'
import { typography } from '../../../../theme/typography';
import SingleInfo from '../components/SingleInfo';
import { translate } from '../../../../i18n';
import PictureSection from '../components/PictureSection';
import { useSettings } from '../../../../services/hooks/features/useSettings';
import { useStores } from '../../../../models';
import { IPopup } from '../../..';

interface IPersonalProps {
    onOpenBottomSheet:(sheet:IPopup, snapPoint:number)=>unknown
}

const PersonalSettings:FC<IPersonalProps> = ({onOpenBottomSheet}) => {
    const { colors } = useAppTheme();
    const {
        authenticationStore: { toggleTheme },
    } = useStores();
    const { user, preferredLanguage, onDetectTimezone } = useSettings()
   


    const openBottomSheet = (name: IPopup, snapPoint: number) => {
        onOpenBottomSheet(name,snapPoint)
    }

    return (
        <View style={[$contentContainer, { backgroundColor: colors.background, opacity: 0.9 }]}>
            <ScrollView bounces={false} style={{ width: "90%", height: "100%" }} showsVerticalScrollIndicator={false}>
                <PictureSection
                    imageUrl={user?.imageUrl}
                    buttonLabel={translate("settingScreen.personalSection.changeAvatar")}
                    onDelete={() => { }}
                    onChange={() => openBottomSheet("Avatar", 1)}
                />
                <SingleInfo title={translate("settingScreen.personalSection.fullName")} value={user?.name} onPress={() => openBottomSheet("Names", 0)} />
                <SingleInfo title={translate("settingScreen.personalSection.yourContact")} value={translate("settingScreen.personalSection.yourContactHint")} onPress={() => openBottomSheet("Contact", 0)} />
                <SingleInfo onPress={() => toggleTheme()} title={translate("settingScreen.personalSection.themes")} value={translate("settingScreen.personalSection.lightModeToDark")} />
                <SingleInfo onPress={() => openBottomSheet("Language", 4)} title={translate("settingScreen.personalSection.language")} value={preferredLanguage?.name} />
                <SingleInfo title={translate("settingScreen.personalSection.timeZone")} value={user?.timeZone} onDetectTimezone={() => onDetectTimezone(user)} onPress={() => openBottomSheet("TimeZone", 4)} />
                <SingleInfo title={translate("settingScreen.personalSection.workSchedule")} value={translate("settingScreen.personalSection.workScheduleHint")} onPress={() => { }} />

                <View style={$dangerZoneContainer}>
                    <Text style={$dangerZoneTitle}>{translate("settingScreen.dangerZone")}</Text>
                    <SingleInfo title={translate("settingScreen.personalSection.removeAccount")} value={translate("settingScreen.personalSection.removeAccountHint")} onPress={() => openBottomSheet("Remove Account", 5)} />
                    <SingleInfo title={translate("settingScreen.personalSection.deleteAccount")} value={translate("settingScreen.personalSection.deleteAccountHint")} onPress={() => openBottomSheet("Delete Account", 5)} />
                </View>

            </ScrollView>
        </View>

    )
}

export default PersonalSettings


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
