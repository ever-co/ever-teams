/* eslint-disable react-native/no-inline-styles */
import React, { FC } from 'react';
import { View } from 'react-native';
import { IPopup } from '..';
import { useSettings } from '../../../../services/hooks/features/useSettings';
import QuitTheTeam from '../Team/QuitTeam';
import RemoveTeam from '../Team/RemoveTeam';
import ChangeTeamLogo from './ChangeTeamLogo';
import ChangeTeamName from './ChangeTeamName';
import ChangeUserAvatar from './ChangeUserAvatar';
import UpdateContactForm from './ContactInfoForm';
import LanguageForm from './LanguageForm';
import UpdateFullNameForm from './UpdateFullNameForm';
import UserRemoveAccount from './UserRemoveAccount';
import UserTimezone from './UserTimezone';
import useAuthenticateUser from '../../../../services/hooks/features/useAuthentificateUser';
import { IUser } from '../../../../services/interfaces/IUserData';

interface IBottomProps {
	onDismiss: () => unknown;
	openBottomSheet?: (sheet: IPopup, snapPoint: number) => unknown;
	openedSheet: IPopup;
}

const BottomSheetContent: FC<IBottomProps> = ({ onDismiss, openBottomSheet, openedSheet }) => {
	const { updateUserInfo } = useSettings();
	const { user } = useAuthenticateUser();
	return (
		<View style={{ width: '100%' }}>
			<View>
				{openedSheet === 'Names' ? (
					<UpdateFullNameForm onUpdateFullName={updateUserInfo} onDismiss={() => onDismiss()} />
				) : null}
				{openedSheet === 'Avatar' ? (
					<ChangeUserAvatar onExtend={() => openBottomSheet('Avatar', 3)} onDismiss={() => onDismiss()} />
				) : null}
				{openedSheet === 'Team Logo' ? (
					<ChangeTeamLogo onExtend={() => openBottomSheet('Team Logo', 3)} onDismiss={() => onDismiss()} />
				) : null}
				{openedSheet === 'Contact' ? (
					<UpdateContactForm
						user={user as IUser}
						onUpdateContactInfo={updateUserInfo}
						onDismiss={() => onDismiss()}
						onChangeSnap={openBottomSheet}
					/>
				) : null}

				{openedSheet === 'TimeZone' ? (
					<UserTimezone
						user={user as IUser}
						onUpdateTimezone={updateUserInfo}
						onDismiss={() => onDismiss()}
					/>
				) : null}

				{openedSheet === 'Language' ? (
					<LanguageForm
						user={user as IUser}
						onUpdateTimezone={updateUserInfo}
						onDismiss={() => onDismiss()}
					/>
				) : null}

				{openedSheet === 'Remove Account' ? (
					<UserRemoveAccount userId={user?.id} actionType={'Remove'} onDismiss={() => onDismiss()} />
				) : null}

				{openedSheet === 'Delete Account' ? (
					<UserRemoveAccount userId={user?.id} actionType={'Delete'} onDismiss={() => onDismiss()} />
				) : null}

				{openedSheet === 'Team Name' ? <ChangeTeamName onDismiss={() => onDismiss()} /> : null}

				{openedSheet === 'Remove Team' ? <RemoveTeam onDismiss={() => onDismiss()} /> : null}
				{openedSheet === 'Quit Team' ? <QuitTheTeam onDismiss={() => onDismiss()} /> : null}
			</View>
		</View>
	);
};

export default BottomSheetContent;
