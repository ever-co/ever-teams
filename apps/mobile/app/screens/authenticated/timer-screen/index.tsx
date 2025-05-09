/* eslint-disable react-native/no-inline-styles */
import React, { FC, useCallback, useEffect, useState } from 'react';
import { ViewStyle, View, LogBox, TouchableWithoutFeedback, StatusBar } from 'react-native';

// COMPONENTS
import { Screen } from '../../../components';
import { AuthenticatedTabScreenProps } from '../../../navigators/authenticated-navigator';
import HomeHeader from '../../../components/home-header';
import DropDown from '../../../components/team-dropdown/drop-down';
import CreateTeamModal from '../../../components/create-team-modal';
import TimerTaskSection from './components/timer-task-section';
import { useOrganizationTeam } from '../../../services/hooks/use-organization';
import useTimerScreenLogic from './logics/useTimerScreenLogic';
import TimerScreenSkeleton from './components/timer-screen-skeleton';
import { useAppTheme } from '../../../theme';
import { useAcceptInviteModal } from '../../../services/hooks/features/use-accept-invite-modal';
import { useTaskInput } from '../../../services/hooks/features/use-task-input';
import AcceptInviteModal from '../team-screen/components/accept-invite-modal';
import NoTeam from '../../../components/no-team';

export const AuthenticatedTimerScreen: FC<AuthenticatedTabScreenProps<'Timer'>> = function AuthenticatedTimerScreen(
	_props
) {
	// HOOKS
	const { createOrganizationTeam, activeTeam } = useOrganizationTeam();
	const { showCreateTeamModal, setShowCreateTeamModal, isTeamModalOpen, setIsTeamModalOpen } = useTimerScreenLogic();
	const [isLoading, setIsLoading] = useState<boolean>(true);

	LogBox.ignoreAllLogs();
	const { colors, dark } = useAppTheme();
	const { openModal, closeModal, activeInvitation, onRejectInvitation, onAcceptInvitation } = useAcceptInviteModal();
	const taskInput = useTaskInput();

	useEffect(() => {
		setTimeout(() => {
			setIsLoading(false);
		}, 2000);
	}, []);

	const onClickOutside = useCallback(() => {
		taskInput.setEditMode(false);
		setIsTeamModalOpen(false);
	}, [taskInput, setIsTeamModalOpen]);

	return (
		<Screen
			contentContainerStyle={[$container, { backgroundColor: colors.background2 }]}
			backgroundColor={dark ? 'rgb(16,17,20)' : colors.background}
			safeAreaEdges={['top']}
		>
			<StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
			<TouchableWithoutFeedback onPress={onClickOutside}>
				<View style={{ flex: 1 }}>
					{isLoading ? (
						// Pass only the required props
						<TimerScreenSkeleton showTaskDropdown={false} />
					) : (
						<React.Fragment>
							<AcceptInviteModal
								visible={openModal}
								onDismiss={() => closeModal()}
								invitation={activeInvitation}
								onAcceptInvitation={onAcceptInvitation}
								onRejectInvitation={onRejectInvitation}
							/>

							<CreateTeamModal
								onCreateTeam={createOrganizationTeam}
								visible={showCreateTeamModal}
								onDismiss={() => setShowCreateTeamModal(false)}
							/>
							<View style={{ zIndex: 1000 }}>
								<HomeHeader props={_props} showTimer={false} />
							</View>

							{activeTeam ? (
								<React.Fragment>
									<View style={{ padding: 20, zIndex: 999, backgroundColor: colors.background }}>
										<DropDown
											isOpen={isTeamModalOpen}
											setIsOpen={setIsTeamModalOpen}
											resized={false}
											onCreateTeam={() => setShowCreateTeamModal(true)}
											isAccountVerified={taskInput.user?.isEmailVerified}
										/>
									</View>

									<TimerTaskSection outsideClick={onClickOutside} taskInput={taskInput} />
								</React.Fragment>
							) : (
								<NoTeam onPress={() => setShowCreateTeamModal(true)} />
							)}
						</React.Fragment>
					)}
				</View>
			</TouchableWithoutFeedback>
		</Screen>
	);
};

const $container: ViewStyle = {
	flex: 1
};
