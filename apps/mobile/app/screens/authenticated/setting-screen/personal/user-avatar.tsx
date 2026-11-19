/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useStores } from '../../../../models';
import { typography } from '../../../../theme';
import { Avatar } from 'react-native-paper';
import { observer } from 'mobx-react-lite';
import { useSettings } from '../../../../services/hooks/features/use-settings';
import ConfirmationModal from '../../../../components/confirmation-modal';
import { translate } from '../../../../i18n';
import { SettingsImageRow } from '../components/settings-kit';
import { imgTitleProfileAvatar } from '../../../../helpers/img-title-profile-avatar';

interface Props {
	buttonLabel: string;
	onChange: () => unknown;
}

function avatarOf(imageUrl: string | undefined, name: string | undefined) {
	if (imageUrl) {
		return <Avatar.Image size={70} source={{ uri: imageUrl }} />;
	}
	return <Avatar.Text size={70} label={imgTitleProfileAvatar(name)} labelStyle={styles.prefix} />;
}

const UserAvatar: FC<Props> = observer(({ buttonLabel, onChange }) => {
	const {
		authenticationStore: { user }
	} = useStores();

	const [openConfirmationModal, setOpenConfirmationModal] = useState<boolean>(false);

	const { updateUserInfo } = useSettings();

	const onDeleteAvatar = useCallback(async () => {
		await updateUserInfo({
			...user,
			imageUrl: null,
			imageId: null,
			image: null
		});
	}, []);

	const imageUrl = useMemo(
		() => user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl,
		[user?.image?.thumb]
	);

	const isDisabled = !(user?.image && user?.imageId && user?.image);

	return (
		<>
			<SettingsImageRow
				image={avatarOf(imageUrl, user?.name)}
				changeLabel={buttonLabel}
				onChange={onChange}
				deleteLabel={translate('settingScreen.membersSettingsScreen.delete')}
				deleteDisabled={isDisabled}
				onDelete={() => setOpenConfirmationModal(true)}
			/>
			<ConfirmationModal
				visible={openConfirmationModal}
				onDismiss={() => setOpenConfirmationModal(false)}
				onConfirm={onDeleteAvatar}
				confirmationText={translate('settingScreen.changeAvatar.avatarDeleteConfirmation')}
			/>
		</>
	);
});

export default UserAvatar;

const styles = StyleSheet.create({
	pictureContainer: {
		borderRadius: 40,
		height: 70,
		width: 70
	},
	prefix: {
		fontFamily: typography.fonts.PlusJakartaSans.light,
		fontSize: 42
	},
	teamImage: {
		alignItems: 'center',
		backgroundColor: '#82c9e0',
		borderRadius: 35,
		elevation: 2,
		height: 70,
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 1.5
		},
		shadowOpacity: 0.18,
		shadowRadius: 1.0,
		width: 70
	}
});
