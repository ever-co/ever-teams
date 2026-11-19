/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import SingleInfo from '../components/single-info';
import { SettingsSection, SettingsSurface } from '../components/settings-kit';
import { translate } from '../../../../i18n';
import type { TxKeyPath } from '../../../../i18n';
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
import { navigateTo } from '../../../../navigators/routes';

interface ITeamSettingProps {
	props: any;
	onOpenBottomSheet: (sheet: IPopup, snapPoint?: number) => unknown;
}

// A count the API has not returned yet shows as loading, never as a number
function activeCount(key: TxKeyPath, total: number | undefined): string {
	if (total === undefined) {
		return translate('common.loading');
	}
	return translate(key, { count: total });
}

function yesOrNo(value: boolean): string {
	if (value) {
		return translate('common.yes');
	}
	return translate('common.no');
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
		navigateTo(navigation, screenName, { previousTab: 2 });
	};

	return (
		<View style={[$contentContainer, { backgroundColor: colors.background }]}>
			<TransferOwnership visible={open} onDismiss={() => setOpen(false)} />
			<ScrollView
				bounces={false}
				style={{ width: '100%', height: '100%' }}
				contentContainerStyle={$content}
				showsVerticalScrollIndicator={false}
			>
				<TeamLogo
					buttonLabel={translate('settingScreen.teamSection.changeLogo')}
					onChange={() => onOpenBottomSheet('Team Logo', 1)}
				/>
				<SettingsSurface>
					<SingleInfo
						title={translate('settingScreen.teamSection.teamName')}
						value={activeTeam?.name}
						onPress={() => onOpenBottomSheet('Team Name', 4)}
					/>
					{isTeamManager ? <SwitchTeamPublicity /> : null}
					{isTeamManager ? <SwitchTimeTracking /> : null}
					<SingleInfo
						title={translate('settingScreen.versionScreen.mainTitle')}
						value={activeCount('settingScreen.teamSection.activeVersions', versions?.total)}
						onPress={() => navigateWithTab('TaskVersion')}
					/>
					<SingleInfo
						title={translate('settingScreen.teamSection.taskStatuses')}
						value={activeCount('settingScreen.teamSection.activeStatuses', statuses?.total)}
						onPress={() => navigateWithTab('TaskStatus')}
					/>
					<SingleInfo
						title={translate('settingScreen.teamSection.taskPriorities')}
						value={activeCount('settingScreen.teamSection.activePriorities', priorities?.total)}
						onPress={() => navigateWithTab('TaskPriority')}
					/>
					<SingleInfo
						title={translate('settingScreen.teamSection.taskSizes')}
						value={activeCount('settingScreen.teamSection.activeSizes', sizes?.total)}
						onPress={() => navigateWithTab('TaskSizeScreen')}
					/>
					<SingleInfo
						title={translate('settingScreen.teamSection.taskLabel')}
						value={activeCount('settingScreen.teamSection.activeLabels', labels?.total)}
						onPress={() => navigateWithTab('TaskLabelScreen')}
					/>
					<SingleInfo
						title={translate('settingScreen.teamSection.teamRole')}
						value={yesOrNo(isTeamManager)}
						onPress={() => navigateWithTab('MembersSettingsScreen')}
					/>
					<SingleInfo
						title={translate('settingScreen.teamSection.workSchedule')}
						value={translate('settingScreen.teamSection.workScheduleHint')}
					/>
				</SettingsSurface>

				<SettingsSection title={translate('settingScreen.dangerZone')} tone="danger">
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
				</SettingsSection>
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

const $content: ViewStyle = {
	gap: 24,
	paddingBottom: 40,
	paddingTop: 16
};
