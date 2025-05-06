/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import { observer } from 'mobx-react-lite';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { pad } from '../helpers/number';
import { useStores } from '../models';
import { useTimer } from '../services/hooks/use-timer';
import { typography, useAppTheme } from '../theme';
import { SvgXml } from 'react-native-svg';
import { timerSmallDarkPlayIcon, timerSmallPlayIcon, timerSmallStopIcon } from './svgs/icons';

const HeaderTimer = observer(() => {
	const { colors, dark } = useAppTheme();
	const {
		TimerStore: { timeCounterState, localTimerStatus },
		TaskStore: { activeTask }
	} = useStores();
	const {
		canRunTimer,
		fomatedTimeCounter: { hours, minutes, seconds, ms_p },
		startTimer,
		stopTimer
	} = useTimer();

	const handleTimer = () => {
		if (!canRunTimer) return;

		if (localTimerStatus.running) {
			stopTimer();
		} else {
			startTimer();
		}
	};

	const getTimePercentage = () => {
		if (activeTask) {
			if (!activeTask.estimate) {
				return 0;
			}
			// convert milliseconds to seconds
			const seconds = timeCounterState / 1000;
			const percentage = seconds / activeTask.estimate;


			return Math.min(Math.round(percentage * 100) / 100, 1);
		} else {
			return 0;
		}
	};

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<TouchableOpacity
				style={[styles.buttonStyle, { opacity: canRunTimer ? 1 : 0.7 }]}
				onPress={() => handleTimer()}
			>
				{localTimerStatus.running ? (
					<SvgXml xml={timerSmallStopIcon} />
				) : dark ? (
					<SvgXml xml={timerSmallDarkPlayIcon} />
				) : (
					<SvgXml xml={timerSmallPlayIcon} />
				)}
			</TouchableOpacity>
			<View style={styles.progressContainer}>
				<Text style={[styles.timerText, { color: colors.primary }]}>
					{pad(hours)}:{pad(minutes)}:{pad(seconds)}
					<Text style={styles.smallTxt}>:{pad(ms_p)}</Text>
				</Text>
				<ProgressBar
					style={{ backgroundColor: '#E9EBF8', height: 4, borderRadius: 3 }}
					progress={getTimePercentage()}
					color={activeTask && activeTask.estimate > 0 ? '#27AE60' : '#F0F0F0'}
				/>
			</View>
		</View>
	);
});

const styles = StyleSheet.create({
	btnImage: {},
	buttonStyle: {
		// paddingHorizontal: 13,
		paddingVertical: 10
	},
	container: {
		alignItems: 'center',
		backgroundColor: '#fff',
		borderColor: 'rgba(0, 0, 0, 0.1)',
		borderRadius: 9,
		borderWidth: 1,
		elevation: 10,
		flexDirection: 'row',
		gap: 9,
		height: 38,
		justifyContent: 'center',
		shadowColor: 'rgba(0, 0, 0, 0.1)',
		shadowOffset: { width: 5, height: 5 },
		shadowOpacity: 0.3,
		shadowRadius: 1,
		width: 126
	},
	progressContainer: {
		height: 21,
		width: '65%'
	},
	smallTxt: {
		fontSize: 8
	},
	timerText: {
		fontFamily: typography.secondary.medium,
		fontSize: 12
	}
});

export default HeaderTimer;
