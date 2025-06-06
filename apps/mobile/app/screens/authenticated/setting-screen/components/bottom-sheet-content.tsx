/* eslint-disable react-native/no-inline-styles */
import React, { FC } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IPopup } from '..';
import { useSettings } from '../../../../services/hooks/features/use-settings';
import QuitTheTeam from '../team/quit-team';
import RemoveTeam from '../team/remove-team';
import ChangeTeamLogo from './change-team-logo';
import ChangeTeamName from './change-team-name';
import ChangeUserAvatar from './change-user-avatar';
import UpdateContactForm from './contact-info-form';
import LanguageForm from './language-form';
import UpdateFullNameForm from './update-full-name-form';
import UserRemoveAccount from './user-remove-account';
import UserTimezone from './user-timezone';
import useAuthenticateUser from '../../../../services/hooks/features/use-authentificate-user';
import { IUser } from '../../../../services/interfaces/IUserData';
import { useAppTheme } from '../../../../theme';
import { typography } from '../../../../theme/typography';

interface IBottomProps {
	onDismiss: () => unknown;
	openBottomSheet?: (sheet: IPopup) => unknown;
	openedSheet: IPopup;
}

const BottomSheetContent: FC<IBottomProps> = ({ onDismiss, openBottomSheet, openedSheet }) => {
	const { colors } = useAppTheme();
	const { updateUserInfo } = useSettings();
	const { user } = useAuthenticateUser();

	// Helper for components that need to open another sheet
	const openSheet = (sheet: IPopup) => {
		if (openBottomSheet) {
			openBottomSheet(sheet);
		}
	};

	// Helper for dismissing the current sheet
	const dismissSheet = () => {
		if (onDismiss) {
			onDismiss();
		}
	};

	return (
		<View style={styles.container}>
			<Text style={[styles.headerText, { color: colors.text }]}>
				{getSheetTitle(openedSheet)}
			</Text>
			<View style={styles.contentContainer}>
				{openedSheet === 'Names' ? (
					<UpdateFullNameForm onUpdateFullName={updateUserInfo} onDismiss={dismissSheet} />
				) : null}
				{openedSheet === 'Avatar' ? (
					<ChangeUserAvatar onExtend={() => openSheet('Avatar 2')} onDismiss={dismissSheet} />
				) : null}
				{openedSheet === 'Team Logo' ? (
					<ChangeTeamLogo onExtend={() => openSheet('Team Logo')} onDismiss={dismissSheet} />
				) : null}
				{openedSheet === 'Contact' ? (
					<UpdateContactForm
						user={user as IUser}
						onUpdateContactInfo={updateUserInfo}
						onDismiss={dismissSheet}
						onChangeSnap={openBottomSheet}
					/>
				) : null}
				{openedSheet === 'TimeZone' ? (
					<UserTimezone
						user={user as IUser}
						onUpdateTimezone={updateUserInfo}
						onDismiss={dismissSheet}
					/>
				) : null}
				{openedSheet === 'Language' ? (
					<LanguageForm
						user={user as IUser}
						onUpdateLanguage={updateUserInfo}
						onDismiss={dismissSheet}
					/>
				) : null}
				{openedSheet === 'Remove Account' ? (
					<UserRemoveAccount userId={user?.id} actionType={'Remove'} onDismiss={dismissSheet} />
				) : null}
				{openedSheet === 'Delete Account' ? (
					<UserRemoveAccount userId={user?.id} actionType={'Delete'} onDismiss={dismissSheet} />
				) : null}
				{openedSheet === 'Team Name' ? <ChangeTeamName onDismiss={dismissSheet} /> : null}
				{openedSheet === 'Remove Team' ? <RemoveTeam onDismiss={dismissSheet} /> : null}
				{openedSheet === 'Quit Team' ? <QuitTheTeam onDismiss={dismissSheet} /> : null}
			</View>
		</View>
	);
};

// Helper function to get a display title based on the sheet type
function getSheetTitle(sheetType: IPopup): string {
	switch (sheetType) {
		case 'Names':
			return 'Update Full Name';
		case 'Avatar':
		case 'Avatar 2':
			return 'Change Avatar';
		case 'Team Logo':
			return 'Team Logo';
		case 'Contact':
			return 'Contact Information';
		case 'Language':
			return 'Select Language';
		case 'TimeZone':
			return 'Select Time Zone';
		case 'Team Name':
			return 'Change Team Name';
		case 'Remove Team':
			return 'Remove Team';
		case 'Quit Team':
			return 'Leave Team';
		case 'Delete Account':
			return 'Delete Account';
		case 'Remove Account':
			return 'Remove Account';
		default:
			return 'Settings';
	}
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
		minHeight: 300,
		paddingVertical: 16,
		paddingHorizontal: 8
	},
	headerText: {
		fontSize: 20,
		fontFamily: typography.primary.semiBold,
		marginBottom: 20,
		textAlign: 'center'
	},
	contentContainer: {
		flex: 1,
		width: '100%'
	}
});

export default BottomSheetContent;
