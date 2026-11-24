/* eslint-disable camelcase */
import React, { FC, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ProgressBar, Text } from 'react-native-paper';

import { useStores } from '../models';
import { observer } from 'mobx-react-lite';
import { pad } from '../helpers/number';
import { useWebTheme } from '../theme';
import { useTimer } from '../services/hooks/use-timer';
import TimerButton from './timer-button';
import { useTaskStatistics } from '../services/hooks/features/use-task-statistics';
import { translate } from '../i18n';
import TimerActionsMenu from './timer-actions-menu';
import TimerStartSheet from './timer-start-sheet';
import type { ThemeColors } from '../../src/theme/use-theme';

export interface Props {}

function progressColorOf(hasEstimate: boolean, colors: ThemeColors) {
	if (hasEstimate) {
		return colors.success;
	}
	return 'transparent';
}

/** Work's clock: the web's tabular digits with the hundredths muted, the estimate's bar and the round button. */
const TimerCard: FC<Props> = observer(() => {
	const theme = useWebTheme();
	const { colors } = theme;
	const {
		TaskStore: { activeTask }
	} = useStores();

	const {
		fomatedTimeCounter: { hours, minutes, seconds, ms_p },
		timerStatus
	} = useTimer();
	const { activeTaskTotalStat } = useTaskStatistics();
	const [startPanelOpen, setStartPanelOpen] = useState(false);
	// A run the API knows: its start can be shown and moved, and the run discarded
	const isRunning = timerStatus?.running === true;
	const hasEstimate = (activeTask?.estimate ?? 0) > 0;
	const openStartPanel = () => setStartPanelOpen(true);
	const closeStartPanel = () => setStartPanelOpen(false);

	// A run that ends closes its panel, so a run started later never opens it by itself
	useEffect(() => {
		if (!isRunning) {
			setStartPanelOpen(false);
		}
	}, [isRunning]);

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
				<View style={styles.timeAndProgressBarWrapper}>
					<TouchableOpacity
						testID="timer-card-time"
						onPress={openStartPanel}
						disabled={!isRunning}
						accessibilityRole={isRunning ? 'button' : 'text'}
						accessibilityHint={isRunning ? translate('timer.discard.changeStart') : undefined}
					>
						<Text
							style={[theme.type.timer, styles.timerText, { color: colors.foreground }]}
							numberOfLines={1}
						>
							{pad(hours)}:{pad(minutes)}:{pad(seconds)}
							<Text style={[styles.fraction, { color: colors['muted-foreground'] }]}>:{pad(ms_p)}</Text>
						</Text>
					</TouchableOpacity>
					<View style={styles.progressRow}>
						<View style={styles.progressBarWrapper}>
							<ProgressBar
								style={[styles.progressBar, { backgroundColor: theme.foreground(10) }]}
								progress={getTimePercentage()}
								color={progressColorOf(hasEstimate, colors)}
							/>
						</View>
						{isRunning ? <TimerActionsMenu onChangeStart={openStartPanel} /> : null}
					</View>
				</View>
				<View style={styles.timerBtn}>
					<TimerButton />
				</View>
			</View>
			<TimerStartSheet visible={startPanelOpen && isRunning} onClose={closeStartPanel} />
		</View>
	);
});

const styles = StyleSheet.create({
	fraction: {
		fontSize: 14,
		fontWeight: '400'
	},
	horizontal: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 16,
		justifyContent: 'space-between',
		width: '100%'
	},
	mainContainer: {
		borderTopWidth: StyleSheet.hairlineWidth,
		paddingTop: 20,
		width: '100%',
		zIndex: 998
	},
	progressBar: {
		borderRadius: 4,
		height: 8,
		width: '100%'
	},
	progressBarWrapper: {
		flex: 1
	},
	progressRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		justifyContent: 'space-between',
		width: '100%'
	},
	timeAndProgressBarWrapper: {
		flex: 1,
		gap: 8
	},
	timerBtn: {
		alignItems: 'center',
		justifyContent: 'center'
	},
	// The web's phone clock: 30 on a 36 line, so the hundredths keep room beside it
	timerText: {
		fontSize: 30,
		lineHeight: 36
	}
});

export default TimerCard;
