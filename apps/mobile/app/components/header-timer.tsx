import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { pad } from '../helpers/number';
import { useStores } from '../models';
import { useTimer } from '../services/hooks/use-timer';
import { useWebTheme } from '../theme';
import { translate } from '../i18n';
import TimerStartSheet from './timer-start-sheet';
import type { ThemeColors } from '../../src/theme/use-theme';
import { RunButton } from '../../src/components/run-button';

function runLabelOf(running: boolean) {
	if (running) {
		return translate('timer.stopLabel');
	}
	return translate('timer.startLabel');
}

function progressColorOf(hasEstimate: boolean, colors: ThemeColors) {
	if (hasEstimate) {
		return colors.success;
	}
	return colors.muted;
}

/** The running timer in the header: the web's compact pill, its time first and its round start or stop at the end. */
const HeaderTimer = observer(() => {
	const theme = useWebTheme();
	const { colors } = theme;
	const {
		TimerStore: { timeCounterState, localTimerStatus },
		TaskStore: { activeTask }
	} = useStores();
	const {
		canRunTimer,
		fomatedTimeCounter: { hours, minutes, seconds, ms_p },
		startTimer,
		stopTimer,
		timerStatus
	} = useTimer();
	const [startPanelOpen, setStartPanelOpen] = useState(false);
	// A run the API knows: tapping its time opens the panel of its start
	const isRunning = timerStatus?.running === true;
	const hasEstimate = (activeTask?.estimate ?? 0) > 0;

	// A run that ends closes its panel, so a run started later never opens it by itself
	useEffect(() => {
		if (!isRunning) {
			setStartPanelOpen(false);
		}
	}, [isRunning]);

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
		<View testID="header-timer" style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }]}>
			<View style={styles.timeColumn}>
				<TouchableOpacity
					testID="header-timer-time"
					onPress={() => setStartPanelOpen(true)}
					disabled={!isRunning}
					accessibilityRole={isRunning ? 'button' : 'text'}
					accessibilityHint={isRunning ? translate('timer.discard.changeStart') : undefined}
				>
					<Text style={[styles.timerText, { color: colors.foreground }]}>
						{pad(hours)}:{pad(minutes)}:{pad(seconds)}
						<Text style={[styles.smallTxt, { color: colors['muted-foreground'] }]}>:{pad(ms_p)}</Text>
					</Text>
				</TouchableOpacity>
				<ProgressBar
					style={[styles.progress, { backgroundColor: colors.muted }]}
					progress={getTimePercentage()}
					color={progressColorOf(hasEstimate, colors)}
				/>
			</View>
			<RunButton
				theme={theme}
				running={localTimerStatus.running}
				size={24}
				disabled={!canRunTimer}
				onPress={handleTimer}
				testID="header-timer-run"
				accessibilityLabel={runLabelOf(localTimerStatus.running)}
			/>
			<TimerStartSheet visible={startPanelOpen && isRunning} onClose={() => setStartPanelOpen(false)} />
		</View>
	);
});

const styles = StyleSheet.create({
	pill: {
		alignItems: 'center',
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		boxShadow: '0 1px 1px rgba(0, 0, 0, 0.04)',
		flexDirection: 'row',
		gap: 8,
		height: 32,
		paddingLeft: 12,
		paddingRight: 4
	},
	progress: {
		borderRadius: 1,
		height: 2
	},
	smallTxt: {
		fontSize: 9
	},
	timeColumn: {
		gap: 2,
		width: 84
	},
	timerText: {
		fontSize: 13,
		fontVariant: ['tabular-nums'],
		fontWeight: '500'
	}
});

export default HeaderTimer;
