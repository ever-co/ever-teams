import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import { ImageStyle, View, ViewStyle } from 'react-native';
import { useStores } from '../models';
import { useTimer } from '../services/hooks/use-timer';
import { ITeamTask } from '../services/interfaces/ITask';
import { useWebTheme } from '../theme';
import { translate } from '../i18n';
import { RunButton } from '../../src/components/run-button';

type TimerButtonProps = {
	task?: ITeamTask;
	containerStyle?: ViewStyle;
	iconStyle?: ImageStyle;
};

/** Work's start or stop: the web's round 48 button, primary to start and destructive to stop, with its glow. */
const TimerButton: FC<TimerButtonProps> = observer(({ containerStyle }) => {
	const {
		TimerStore: { localTimerStatus }
	} = useStores();
	const { canRunTimer, startTimer, stopTimer } = useTimer();
	const theme = useWebTheme();

	if (localTimerStatus.running) {
		return (
			<View style={containerStyle}>
				<RunButton
					theme={theme}
					running
					size={48}
					glow
					onPress={() => stopTimer()}
					testID="timer-stop"
					accessibilityLabel={translate('timer.stopLabel')}
				/>
			</View>
		);
	}

	return (
		<View style={containerStyle}>
			<RunButton
				theme={theme}
				running={false}
				size={48}
				glow
				disabled={!canRunTimer}
				onPress={() => startTimer()}
				testID="timer-start"
				accessibilityLabel={translate('timer.startLabel')}
			/>
		</View>
	);
});

export default TimerButton;
