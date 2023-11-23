/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
// import { LinearGradient } from "expo-linear-gradient"
import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import { View, StyleSheet, ViewStyle, ImageStyle, Pressable, Dimensions, PixelRatio } from 'react-native';

import { useStores } from '../models';
import { useTimer } from '../services/hooks/useTimer';
import { ITeamTask } from '../services/interfaces/ITask';
import { useAppTheme } from '../theme';
import { SvgXml } from 'react-native-svg';
import { timerLargeDarkPlayIcon, timerLargePlayIcon, timerLargeStopIcon } from './svgs/icons';

type TimerButtonProps = {
	task?: ITeamTask;
	containerStyle?: ViewStyle;
	iconStyle?: ImageStyle;
};

const { width: screenWidth } = Dimensions.get('window');

const pixelDensity = PixelRatio.get();

const TimerButton: FC<TimerButtonProps> = observer(({ containerStyle }) => {
	const {
		TimerStore: { localTimerStatus }
	} = useStores();
	const { canRunTimer, startTimer, stopTimer } = useTimer();
	const { dark } = useAppTheme();

	return (
		<View>
			{!localTimerStatus.running ? (
				<>
					<Pressable
						style={[
							dark ? styles.timerBtnDarkTheme : styles.timerBtnInactive,
							containerStyle,
							{
								backgroundColor: dark ? '#1e2430' : '#fff',
								opacity: canRunTimer ? 1 : 0.4,
								borderColor: dark ? '#28292F' : '#0000001A'
							}
						]}
						disabled={!canRunTimer}
						onPress={() => startTimer()}
					>
						<SvgXml xml={dark ? timerLargeDarkPlayIcon : timerLargePlayIcon} />
					</Pressable>
				</>
			) : (
				<Pressable
					onPress={() => stopTimer()}
					style={[
						dark ? styles.timerBtnDarkTheme : styles.timerBtnActive,
						{ backgroundColor: '#e11d48', borderColor: dark ? '#28292F' : '#0000001A' },
						containerStyle
					]}
				>
					<SvgXml xml={timerLargeStopIcon} />
				</Pressable>
			)}
		</View>
	);
});

export default TimerButton;

const styles = StyleSheet.create({
	timerBtnActive: {
		alignItems: 'center',
		backgroundColor: '#3826A6',
		borderColor: 'rgba(0, 0, 0, 0.1)',
		borderRadius: 30,
		borderWidth: 1,
		elevation: 8,
		height: 60,
		justifyContent: 'center',
		marginRight: screenWidth * 0.0467 * (pixelDensity / 3),
		shadowColor: '#e11d48',
		shadowOffset: {
			width: 0,
			height: 17
		},
		shadowOpacity: 0.3,
		shadowRadius: 12,
		width: 60
	},
	timerBtnDarkTheme: {
		alignItems: 'center',
		// backgroundColor: "#3826A6",
		borderColor: 'rgba(0, 0, 0, 0.1)',
		borderRadius: 30,
		borderWidth: 1,
		elevation: 8,
		height: 60,
		justifyContent: 'center',
		marginRight: screenWidth * 0.0467 * (pixelDensity / 3),
		width: 60
	},
	timerBtnInactive: {
		alignItems: 'center',
		backgroundColor: '#3826A6',
		borderColor: 'rgba(0, 0, 0, 0.1)',
		borderRadius: 30,
		borderWidth: 1,
		elevation: 8,
		height: 60,
		justifyContent: 'center',
		marginRight: screenWidth * 0.0467 * (pixelDensity / 3),
		shadowColor: '#3826A6',
		shadowOffset: {
			width: 0,
			height: 17
		},
		shadowOpacity: 0.3,
		shadowRadius: 12,
		width: 60
	},
	timerIcon: {
		height: 24,
		width: 24
	}
});
