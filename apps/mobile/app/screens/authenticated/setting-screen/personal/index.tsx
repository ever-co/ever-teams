/* eslint-disable react-native/no-inline-styles */
import { ScrollView, View, ViewStyle } from 'react-native';
import React, { FC } from 'react';
import SingleInfo from '../components/single-info';
import { SettingsSection, SettingsSurface } from '../components/settings-kit';
import { translate } from '../../../../i18n';
import { useSettings } from '../../../../services/hooks/features/use-settings';
import { useStores } from '../../../../models';
import { IPopup } from '../../..';
import FlashMessage from 'react-native-flash-message';
import { useAppTheme } from '../../../../theme';
import UserAvatar from './user-avatar';
import useAuthenticateUser from '../../../../services/hooks/features/use-authentificate-user';

interface IPersonalProps {
	onOpenBottomSheet: (sheet: IPopup) => unknown;
}

const PersonalSettings: FC<IPersonalProps> = ({ onOpenBottomSheet }) => {
	const { colors, dark } = useAppTheme();
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
		<View style={[$contentContainer, { backgroundColor: colors.background }]}>
			<ScrollView
				bounces={false}
				style={{ width: '100%', height: '100%' }}
				contentContainerStyle={$content}
				showsVerticalScrollIndicator={false}
			>
				<UserAvatar
					buttonLabel={translate('settingScreen.personalSection.changeAvatar')}
					onChange={() => openSheet('Avatar')}
				/>
				<SettingsSurface>
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
						onPress={() => toggleTheme(dark)}
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
				</SettingsSurface>

				<SettingsSection title={translate('settingScreen.dangerZone')} tone="danger">
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
				</SettingsSection>
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

const $content: ViewStyle = {
	gap: 24,
	paddingBottom: 40,
	paddingTop: 16
};
