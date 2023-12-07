/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
/* eslint-disable camelcase */
import React, { FC } from 'react';
import { Dimensions, View } from 'react-native';
import { ProgressBar, Text } from 'react-native-paper';
import EStyleSheet from 'react-native-extended-stylesheet';

import { useStores } from '../models';
import { observer } from 'mobx-react-lite';
import { pad } from '../helpers/number';
import { typography, useAppTheme } from '../theme';
import { useTimer } from '../services/hooks/useTimer';
import TimerButton from './TimerButton';
import { useTaskStatistics } from '../services/hooks/features/useTaskStatics';

export interface Props {}

const { width: screenWidth } = Dimensions.get('window');
const TimerCard: FC<Props> = observer(() => {
	const { colors } = useAppTheme();
	const {
		TaskStore: { activeTask }
	} = useStores();

	const {
		fomatedTimeCounter: { hours, minutes, seconds, ms_p }
	} = useTimer();
	const { activeTaskTotalStat } = useTaskStatistics();

	const getTimePercentage = () => {
		if (activeTask) {
			if (!activeTask.estimate) {
				return 0;
			}

			return activeTaskTotalStat?.duration ? activeTaskTotalStat?.duration / activeTask?.estimate : 0;
		} else {
			return 0;
		}
	};

	return (
		<View style={[styles.mainContainer, { borderTopColor: colors.border }]}>
			<View style={styles.horizontal}>
				<View
					style={[styles.timeAndProgressBarWrapper, { borderRightColor: colors.border, borderRightWidth: 2 }]}
				>
					<Text style={[styles.timerText, { color: colors.primary }]} numberOfLines={1}>
						{pad(hours)}:{pad(minutes)}:{pad(seconds)}
						<Text style={{ fontSize: screenWidth * 0.03, fontWeight: '600' }}>:{pad(ms_p)}</Text>
					</Text>
					<View style={{ width: '85%' }}>
						<ProgressBar
							style={styles.progressBar}
							progress={getTimePercentage()}
							color={activeTask && activeTask.estimate > 0 ? '#27AE60' : '#F0F0F0'}
						/>
					</View>
				</View>
				<View style={[styles.timerBtn, { borderLeftColor: colors.border }]}>
					<TimerButton />
				</View>
			</View>
		</View>
	);
});

const styles = EStyleSheet.create({
	mainContainer: {
		width: '100%',
		borderTopColor: 'rgba(0, 0, 0, 0.06)',
		borderTopWidth: 1,
		paddingTop: 24,
		zIndex: 998
	},
	timerBtn: {
		marginVertical: 4,
		justifyContent: 'center',
		alignItems: 'center',
		height: '100%'
	},
	progressBar: { backgroundColor: '#E9EBF8', width: '100%', height: 6, borderRadius: 3 },
	timeAndProgressBarWrapper: {
		flexDirection: 'column',
		justifyContent: 'space-between',
		height: 70,
		paddingBottom: 0,
		flex: 0.9
	},
	horizontal: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%',
		height: 70
	},
	loading: {
		position: 'absolute',
		right: 10,
		top: 15
	},
	timerText: {
		fontWeight: '600',
		fontSize: screenWidth * 0.082,
		marginTop: 0,
		paddingTop: 0,
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		width: '100%'
	}
});

export default TimerCard;
