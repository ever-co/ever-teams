/* eslint-disable react-native/no-inline-styles */
import { View, ViewStyle, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import React, { FC, useEffect } from 'react';
import { AuthenticatedDrawerScreenProps } from '../../../navigators/authenticated-navigator';
import { Screen } from '../../../components';
import { useAppTheme, useWebTheme } from '../../../theme';
import { AntDesign } from '@expo/vector-icons';
import { useTeamTasks } from '../../../services/hooks/features/use-team-tasks';
import TaskTitleBlock from '../../../components/task/title-block';
import DetailsBlock from '../../../components/task/details-block';
import { translate } from '../../../i18n';
import EstimateBlock from '../../../components/task/estimate-block';
import TimeBlock from '../../../components/task/time-block';
import LinkedIssuesBlock from '../../../components/task/linked-issues-block';
import DescriptionBlock from '../../../components/task/description-block';
import { navigateTo } from '../../../navigators/routes';

export const AuthenticatedTaskScreen: FC<AuthenticatedDrawerScreenProps<'TaskScreen'>> = (_props) => {
	const { dark } = useAppTheme();
	const theme = useWebTheme();
	const { navigation, route } = _props;
	const { taskId } = route.params;
	const { getTaskById, detailedTask: task } = useTeamTasks();

	useEffect(() => {
		if (route.params.taskId) {
			getTaskById(taskId);
		}
	}, [getTaskById, route, task, route.params.taskId]);

	return (
		<Screen
			contentContainerStyle={[$container, { backgroundColor: theme.colors.background }]}
			safeAreaEdges={['top']}
		>
			<StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
			<View testID="task-screen" style={{ flex: 1 }}>
				<View style={[$headerContainer, { backgroundColor: theme.colors.background }]}>
					<TouchableOpacity
						testID="task-back"
						accessibilityRole="button"
						accessibilityLabel={translate('common.back')}
						hitSlop={12}
						onPress={() => navigateTo(navigation, 'AuthenticatedTab')}
					>
						<AntDesign name="arrow-left" size={24} color={theme.colors.foreground} />
					</TouchableOpacity>
				</View>
				<View style={styles.screenContentWrapper}>
					<ScrollView
						style={{
							width: '100%',
							height: '100%',
							paddingHorizontal: 16
						}}
						bounces={false}
						showsVerticalScrollIndicator={false}
					>
						<TaskTitleBlock />
						<DescriptionBlock />
						<DetailsBlock />
						<EstimateBlock />
						<TimeBlock />
						<LinkedIssuesBlock />
					</ScrollView>
				</View>
			</View>
		</Screen>
	);
};

const $container: ViewStyle = {
	flex: 1
};

const $headerContainer: ViewStyle = {
	alignItems: 'flex-start',
	justifyContent: 'center',
	minHeight: 48,
	paddingHorizontal: 16,
	zIndex: 10
};

const styles = StyleSheet.create({
	screenContentWrapper: {
		alignItems: 'center',
		flex: 4,
		gap: 12,
		paddingBottom: 20,
		width: '100%'
	}
});
