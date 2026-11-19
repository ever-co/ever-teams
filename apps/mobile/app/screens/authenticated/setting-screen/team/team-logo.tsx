/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { imgTitle } from '../../../../helpers/img-title';
import { useStores } from '../../../../models';
import { typography } from '../../../../theme';
import { Avatar } from 'react-native-paper';
import { observer } from 'mobx-react-lite';
import { useOrganizationTeam } from '../../../../services/hooks/use-organization';

import ConfirmationModal from '../../../../components/confirmation-modal';
import { translate } from '../../../../i18n';
import { SettingsImageRow } from '../components/settings-kit';

interface Props {
	buttonLabel: string;
	onChange: () => unknown;
}

function logoOf(imageUrl: string | null | undefined, teamName: string) {
	if (imageUrl) {
		return <Avatar.Image size={70} source={{ uri: imageUrl }} />;
	}
	return <Avatar.Text size={70} label={imgTitle(teamName)} labelStyle={styles.prefix} />;
}

const TeamLogo: FC<Props> = observer(({ buttonLabel, onChange }) => {
	const {
		teamStore: { activeTeam, activeTeamId }
	} = useStores();
	const { onUpdateOrganizationTeam } = useOrganizationTeam();
	const [openConfirmationModal, setOpenConfirmationModal] = useState<boolean>(false);

	const onDeleteLogo = useCallback(async () => {
		await onUpdateOrganizationTeam({
			id: activeTeamId,
			data: {
				...activeTeam,
				imageId: null,
				image: null,
				logo: null
			}
		});
	}, []);

	const imageUrl = useMemo(
		() => activeTeam?.image?.thumbUrl || activeTeam?.image?.fullUrl || activeTeam?.logo,
		[activeTeam?.image?.thumb]
	);

	const isDisabled = !(activeTeam?.image && activeTeam?.imageId && activeTeam?.image);

	return (
		<>
			<SettingsImageRow
				image={logoOf(imageUrl, activeTeam?.name)}
				changeLabel={buttonLabel}
				onChange={onChange}
				deleteLabel={translate('settingScreen.membersSettingsScreen.delete')}
				deleteDisabled={isDisabled}
				onDelete={() => setOpenConfirmationModal(true)}
			/>
			{/* Confirmation Modal */}
			<ConfirmationModal
				visible={openConfirmationModal}
				onDismiss={() => setOpenConfirmationModal(false)}
				onConfirm={onDeleteLogo}
				confirmationText={translate('settingScreen.changeAvatar.logoDeleteConfirmation')}
			/>
		</>
	);
});

export default TeamLogo;

const styles = StyleSheet.create({
	pictureContainer: {
		borderRadius: 40,
		height: 70,
		width: 70
	},
	prefix: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 24,
		fontWeight: '600'
	},
	teamImage: {
		alignItems: 'center',
		backgroundColor: '#C1E0EA',
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
