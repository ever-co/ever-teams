/* eslint-disable react-native/no-inline-styles */
import { ScrollView, Text, TextStyle, View, ViewStyle } from 'react-native';
import React, { FC } from 'react';
import { typography } from '../../../../theme/typography';
import SingleInfo from '../components/single-info';
import { translate } from '../../../../i18n';
import { useSettings } from '../../../../services/hooks/features/useSettings';
import { useStores } from '../../../../models';
import { IPopup } from '../../..';
import FlashMessage from 'react-native-flash-message';
import { useAppTheme } from '../../../../theme';
import UserAvatar from './user-avatar';
import useAuthenticateUser from '../../../../services/hooks/features/useAuthentificateUser';

interface IPersonalProps {
	onOpenBottomSheet: (sheet: IPopup) => unknown;
}

const PersonalSettings: FC<IPersonalProps> = ({ onOpenBottomSheet }) => {
	const { colors } = useAppTheme();
	const {
		authenticationStore: { toggleTheme }
	} = useStores();
	const { preferredLanguage, onDetectTimezone } = useSettings();
	const { user } = useAuthenticateUser();

	// Updated function to match the new signature - removed snapPoint parameter
	const openSheet = (name: IPopup) => {
		onOpenBottomSheet(name);
	};

	return (
		<View style={[$contentContainer, { backgroundColor: colors.background, opacity: 0.9 }]}>
			<ScrollView bounces={false} style={{ width: '100%', height: '100%' }} showsVerticalScrollIndicator={false}>
				<UserAvatar
					buttonLabel={translate('settingScreen.personalSection.changeAvatar')}
					onChange={() => openSheet('Avatar')}
				/>
				<SingleInfo
					title={translate('settingScreen.personalSection.fullName')}
					value={user?.name}
					onPress={() => openSheet('Names')}
				/>
				<SingleInfo
					title={translate('settingScreen.personalSection.yourContact')}
					value={translate('settingScreen.personalSection.yourContactHint')}
					onPress={() => openSheet('Contact')}
				/>
				<SingleInfo
					onPress={() => toggleTheme()}
					title={translate('settingScreen.personalSection.themes')}
					value={translate('settingScreen.personalSection.lightModeToDark')}
				/>
				<SingleInfo
					onPress={() => openSheet('Language')}
					title={translate('settingScreen.personalSection.language')}
					value={preferredLanguage?.name}
				/>
				<SingleInfo
					title={translate('settingScreen.personalSection.timeZone')}
					value={user?.timeZone}
					onDetectTimezone={() => onDetectTimezone()}
					onPress={() => openSheet('TimeZone')}
				/>
				<SingleInfo
					title={translate('settingScreen.personalSection.workSchedule')}
					value={translate('settingScreen.personalSection.workScheduleHint')}
				/>

				<View style={$dangerZoneContainer}>
					<Text style={$dangerZoneTitle}>{translate('settingScreen.dangerZone')}</Text>
					<SingleInfo
						title={translate('settingScreen.personalSection.removeAccount')}
						value={translate('settingScreen.personalSection.removeAccountHint')}
						onPress={() => openSheet('Remove Account')}
					/>
					<SingleInfo
						title={translate('settingScreen.personalSection.deleteAccount')}
						value={translate('settingScreen.personalSection.deleteAccountHint')}
						onPress={() => openSheet('Delete Account')}
					/>
				</View>
			</ScrollView>
			<FlashMessage position={'bottom'} />
		</View>
	);
};

export default PersonalSettings;

const $contentContainer: ViewStyle = {
	width: '100%',
	alignItems: 'center',
	zIndex: 10
};

const $dangerZoneContainer: ViewStyle = {
	borderTopColor: 'rgba(0, 0, 0, 0.09)',
	borderTopWidth: 1,
	paddingTop: 32,
	marginTop: 32,
	marginBottom: 40
};
const $dangerZoneTitle: TextStyle = {
	color: '#DA5E5E',
	fontSize: 20,
	fontFamily: typography.primary.semiBold
};
