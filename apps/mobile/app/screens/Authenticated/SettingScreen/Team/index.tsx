/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from 'react';
import { ScrollView, Text, TextStyle, View, ViewStyle } from 'react-native';
import { typography } from '../../../../theme/typography';
import SingleInfo from '../components/SingleInfo';
import { translate } from '../../../../i18n';
import { useStores } from '../../../../models';
import { useOrganizationTeam } from '../../../../services/hooks/useOrganization';
import SwithTimeTracking from '../components/SwitchTimeTracking';
import { IPopup } from '..';
import { observer } from 'mobx-react-lite';
import { useAppTheme } from '../../../../theme';
import TeamLogo from './TeamLogo';
import TransferOwnership from './TransferOwnership';
import { useTaskStatus } from '../../../../services/hooks/features/useTaskStatus';
import { useTaskPriority } from '../../../../services/hooks/features/useTaskPriority';
import { useTaskSizes } from '../../../../services/hooks/features/useTaskSizes';
import { useTaskLabels } from '../../../../services/hooks/features/useTaskLabels';
import { useTaskVersion } from '../../../../services/hooks/features/useTaskVersion';
import SwitchTeamPublicity from '../components/SwitchTeamPublicity';

interface ITeamSettingProps {
	props: any;
	onOpenBottomSheet: (sheet: IPopup, snapPoint: number) => unknown;
}
const TeamSettings: FC<ITeamSettingProps> = observer(({ props, onOpenBottomSheet }) => {
	const { colors } = useAppTheme();
	const {
		teamStore: { activeTeam }
	} = useStores();
	const { isTeamManager } = useOrganizationTeam();

	const [open, setOpen] = useState(false);
	const { navigation } = props;

	const { statuses } = useTaskStatus();
	const { priorities } = useTaskPriority();
	const { sizes } = useTaskSizes();
	const { labels } = useTaskLabels();
	const { versions } = useTaskVersion();

	return (
		<View style={[$contentContainer, { backgroundColor: colors.background, opacity: 0.9 }]}>
			<TransferOwnership visible={open} onDismiss={() => setOpen(false)} />
			<ScrollView bounces={false} style={{ width: '100%', height: '100%' }} showsVerticalScrollIndicator={false}>
				<TeamLogo
					buttonLabel={translate('settingScreen.teamSection.changeLogo')}
					onChange={() => onOpenBottomSheet('Team Logo', 1)}
				/>
				<SingleInfo
					title={translate('settingScreen.teamSection.teamName')}
					value={activeTeam?.name}
					onPress={() => onOpenBottomSheet('Team Name', 4)}
				/>
				{isTeamManager ? <SwitchTeamPublicity /> : null}
				{isTeamManager ? <SwithTimeTracking /> : null}
				<SingleInfo
					title={'Task Versions'}
					value={`There ${versions?.total === 1 ? 'is' : 'are'} ${versions?.total} active ${
						versions?.total === 1 ? 'version' : 'versions'
					}`}
					onPress={() => navigation.navigate('TaskVersion')}
				/>
				<SingleInfo
					title={translate('settingScreen.teamSection.taskStatuses')}
					value={`There are ${statuses?.total} active statuses`}
					onPress={() => navigation.navigate('TaskStatus')}
				/>
				<SingleInfo
					title={translate('settingScreen.teamSection.taskPriorities')}
					value={`There are ${priorities?.total} active priorities`}
					onPress={() => navigation.navigate('TaskPriority')}
				/>
				<SingleInfo
					title={translate('settingScreen.teamSection.taskSizes')}
					value={`There are ${sizes?.total} active sizes`}
					onPress={() => navigation.navigate('TaskSizeScreen')}
				/>
				<SingleInfo
					title={translate('settingScreen.teamSection.taskLabel')}
					value={`There ${labels?.total === 1 ? 'is' : 'are'} ${labels?.total} active ${
						labels?.total === 1 ? 'label' : 'labels'
					}`}
					onPress={() => navigation.navigate('TaskLabelScreen')}
				/>
				<SingleInfo
					title={translate('settingScreen.teamSection.teamRole')}
					value={isTeamManager ? 'Yes' : 'No'}
					onPress={() => navigation.navigate('MembersSettingsScreen')}
				/>
				<SingleInfo
					title={translate('settingScreen.teamSection.workSchedule')}
					value={translate('settingScreen.teamSection.workScheduleHint')}
				/>

				<View style={$dangerZoneContainer}>
					<Text style={$dangerZoneTitle}>{translate('settingScreen.dangerZone')}</Text>
					<SingleInfo
						title={translate('settingScreen.teamSection.transferOwnership')}
						value={translate('settingScreen.teamSection.transferOwnership')}
						onPress={() => setOpen(true)}
					/>
					<SingleInfo
						title={translate('settingScreen.teamSection.removeTeam')}
						value={translate('settingScreen.teamSection.removeTeamHint')}
						onPress={() => onOpenBottomSheet('Remove Team', 5)}
					/>
					<SingleInfo
						title={translate('settingScreen.teamSection.quitTeam')}
						value={translate('settingScreen.teamSection.quitTeamHint')}
						onPress={() => onOpenBottomSheet('Quit Team', 5)}
					/>
				</View>
			</ScrollView>
		</View>
	);
});

export default TeamSettings;

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
