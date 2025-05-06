/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useState } from 'react';
import { ViewStyle, LogBox, StatusBar } from 'react-native';
import { AuthenticatedTabScreenProps } from '../../../navigators/authenticated-navigator';
import { Screen } from '../../../components';
import HomeHeader from '../../../components/home-header';
import ProfileHeader from './components/profile-header';
import { useStores } from '../../../models';
import TaskFilter from './components/task-filter';
import { useTaskFilter } from '../../../services/hooks/features/use-task-filters';
import UserProfileTasks from './components/user-profile-tasks';
import ProfileScreenSkeleton from './components/profile-screen-skeleton';
import { useAcceptInviteModal } from '../../../services/hooks/features/use-accept-invite-modal';
import AcceptInviteModal from '../team-screen/components/accept-invite-modal';
import NoTeam from '../../../components/no-team';
import CreateTeamModal from '../../../components/create-team-modal';
import { useOrganizationTeam } from '../../../services/hooks/use-organization';
import { useProfileScreenLogic } from './logics/use-profile-screen-logic';
import { useAppTheme } from '../../../theme';

export const AuthenticatedProfileScreen: FC<AuthenticatedTabScreenProps<'Profile'>> =
	function AuthenticatedProfileScreen(_props) {
		LogBox.ignoreAllLogs();
		const {
			TimerStore: { localTimerStatus }
		} = useStores();

		const { dark, colors } = useAppTheme();

		const { activeTab, userId } = _props.route.params || { activeTab: 'worked' };

		const { openModal, closeModal, activeInvitation, onRejectInvitation, onAcceptInvitation } =
			useAcceptInviteModal();
		const profile = useProfileScreenLogic({ activeTab, userId });
		const hook = useTaskFilter(profile);
		const { createOrganizationTeam, activeTeam } = useOrganizationTeam();

		const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

		return (
			<Screen
				preset="fixed"
				contentContainerStyle={$container}
				safeAreaEdges={['top']}
				backgroundColor={dark ? 'rgb(16,17,20)' : colors.background}
			>
				<StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
				{profile.isLoading ? (
					<ProfileScreenSkeleton />
				) : (
					<>
						<AcceptInviteModal
							visible={openModal}
							onDismiss={() => closeModal()}
							invitation={activeInvitation}
							onAcceptInvitation={onAcceptInvitation}
							onRejectInvitation={onRejectInvitation}
						/>
						<HomeHeader props={_props} showTimer={localTimerStatus.running} />
						{activeTeam ? (
							<>
								<ProfileHeader {...profile.member?.employee.user} />
								<TaskFilter profile={profile} hook={hook} />
								<UserProfileTasks profile={profile} content={hook} />
							</>
						) : (
							<>
								<CreateTeamModal
									onCreateTeam={createOrganizationTeam}
									visible={showCreateTeamModal}
									onDismiss={() => setShowCreateTeamModal(false)}
								/>
								<NoTeam onPress={() => setShowCreateTeamModal(true)} />
							</>
						)}
					</>
				)}
			</Screen>
		);
	};

const $container: ViewStyle = {
	flex: 1
};
