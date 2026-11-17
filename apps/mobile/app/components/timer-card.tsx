/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
/* eslint-disable camelcase */
import React, { FC, useEffect, useState } from 'react';
import { Dimensions, TouchableOpacity, View } from 'react-native';
import { ProgressBar, Text } from 'react-native-paper';
import EStyleSheet from 'react-native-extended-stylesheet';

import { useStores } from '../models';
import { observer } from 'mobx-react-lite';
import { pad } from '../helpers/number';
import { typography, useAppTheme } from '../theme';
import { useTimer } from '../services/hooks/use-timer';
import TimerButton from './timer-button';
import { useTaskStatistics } from '../services/hooks/features/use-task-statistics';
import { translate } from '../i18n';
import TimerActionsMenu from './timer-actions-menu';
import TimerStartSheet from './timer-start-sheet';

export interface Props {}

const { width: screenWidth } = Dimensions.get('window');
const TimerCard: FC<Props> = observer(() => {
	const { colors } = useAppTheme();
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
				<View
					style={[styles.timeAndProgressBarWrapper, { borderRightColor: colors.border, borderRightWidth: 2 }]}
				>
					<TouchableOpacity
						testID="timer-card-time"
						onPress={openStartPanel}
						disabled={!isRunning}
						accessibilityRole={isRunning ? 'button' : 'text'}
						accessibilityHint={isRunning ? translate('timer.discard.changeStart') : undefined}
					>
						<Text style={[styles.timerText, { color: colors.primary }]} numberOfLines={1}>
							{pad(hours)}:{pad(minutes)}:{pad(seconds)}
							<Text style={{ fontSize: screenWidth * 0.03, fontWeight: '600' }}>:{pad(ms_p)}</Text>
						</Text>
					</TouchableOpacity>
					<View style={styles.progressRow}>
						<View style={styles.progressBarWrapper}>
							<ProgressBar
								style={styles.progressBar}
								progress={getTimePercentage()}
								color={hasEstimate ? '#27AE60' : '#F0F0F0'}
							/>
						</View>
						{isRunning ? <TimerActionsMenu onChangeStart={openStartPanel} /> : null}
					</View>
				</View>
				<View style={[styles.timerBtn, { borderLeftColor: colors.border }]}>
					<TimerButton />
				</View>
			</View>
			<TimerStartSheet visible={startPanelOpen && isRunning} onClose={closeStartPanel} />
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
	progressBarWrapper: { width: '85%' },
	progressRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%'
	},
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
