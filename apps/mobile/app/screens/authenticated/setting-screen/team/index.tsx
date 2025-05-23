/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from 'react';
import { ScrollView, Text, TextStyle, View, ViewStyle } from 'react-native';
import { typography } from '../../../../theme/typography';
import SingleInfo from '../components/single-info';
import { translate } from '../../../../i18n';
import { useStores } from '../../../../models';
import { useOrganizationTeam } from '../../../../services/hooks/use-organization';
import SwitchTimeTracking from '../components/switch-time-tracking';
import { IPopup } from '..';
import { observer } from 'mobx-react-lite';
import { useAppTheme } from '../../../../theme';
import TeamLogo from './team-logo';
import TransferOwnership from './transfer-ownership';
import { useTaskStatus } from '../../../../services/hooks/features/use-task-status';
import { useTaskPriority } from '../../../../services/hooks/features/use-task-priority';
import { useTaskSizes } from '../../../../services/hooks/features/use-task-sizes';
import { useTaskLabels } from '../../../../services/hooks/features/use-task-labels';
import { useTaskVersion } from '../../../../services/hooks/features/use-task-version';
import SwitchTeamPublicity from '../components/switch-team-publicity';
// import { NavigationProp } from '@react-navigation/native';
import { AuthenticatedDrawerParamList } from '../../../../navigators/authenticated-navigator';

interface ITeamSettingProps {
	props: any;
	onOpenBottomSheet: (sheet: IPopup, snapPoint?: number) => unknown;
}

const TeamSettings: FC<ITeamSettingProps> = observer(({ props, onOpenBottomSheet }) => {
	const { colors } = useAppTheme();
	const {
		teamStore: { activeTeam }
	} = useStores();
	const { isTeamManager, activeTeamManagers, currentUser } = useOrganizationTeam();

	const [open, setOpen] = useState(false);
	const { navigation } = props;

	const { statuses } = useTaskStatus();
	const { priorities } = useTaskPriority();
	const { sizes } = useTaskSizes();
	const { labels } = useTaskLabels();
	const { versions } = useTaskVersion();

	// Function to navigate to screens with previousTab param
	const navigateWithTab = (screenName: keyof AuthenticatedDrawerParamList) => {
		navigation.navigate(screenName, { previousTab: 2 });
	};

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
				{isTeamManager ? <SwitchTimeTracking /> : null}
				<SingleInfo
					title={'Task Versions'}
					value={`There ${versions?.total === 1 ? 'is' : 'are'} ${versions?.total} active ${
						versions?.total === 1 ? 'version' : 'versions'
					}`}
					onPress={() => navigateWithTab('TaskVersion')}
				/>
				<SingleInfo
					title={translate('settingScreen.teamSection.taskStatuses')}
					value={`There are ${statuses?.total} active statuses`}
					onPress={() => navigateWithTab('TaskStatus')}
				/>
				<SingleInfo
					title={translate('settingScreen.teamSection.taskPriorities')}
					value={`There are ${priorities?.total} active priorities`}
					onPress={() => navigateWithTab('TaskPriority')}
				/>
				<SingleInfo
					title={translate('settingScreen.teamSection.taskSizes')}
					value={`There are ${sizes?.total} active sizes`}
					onPress={() => navigateWithTab('TaskSizeScreen')}
				/>
				<SingleInfo
					title={translate('settingScreen.teamSection.taskLabel')}
					value={`There ${labels?.total === 1 ? 'is' : 'are'} ${labels?.total} active ${
						labels?.total === 1 ? 'label' : 'labels'
					}`}
					onPress={() => navigateWithTab('TaskLabelScreen')}
				/>
				<SingleInfo
					title={translate('settingScreen.teamSection.teamRole')}
					value={isTeamManager ? 'Yes' : 'No'}
					onPress={() => navigateWithTab('MembersSettingsScreen')}
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
						disabled={!(isTeamManager && activeTeamManagers.length >= 2)}
					/>
					<SingleInfo
						title={translate('settingScreen.teamSection.removeTeam')}
						value={translate('settingScreen.teamSection.removeTeamHint')}
						onPress={() => onOpenBottomSheet('Remove Team', 5)}
						disabled={!(isTeamManager && activeTeamManagers.length === 1)}
					/>
					<SingleInfo
						title={translate('settingScreen.teamSection.quitTeam')}
						value={translate('settingScreen.teamSection.quitTeamHint')}
						onPress={() => onOpenBottomSheet('Quit Team', 5)}
						disabled={
							!(
								(isTeamManager && activeTeamManagers.length > 1) ||
								(!isTeamManager &&
									activeTeam?.members?.some((member) => member.employee.userId === currentUser?.id))
							)
						}
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
	zIndex: 1 // Lower z-index than the bottom sheet
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
