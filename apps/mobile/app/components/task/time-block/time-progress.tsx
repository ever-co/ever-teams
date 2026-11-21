import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { ITeamTask } from '../../../services/interfaces/ITask';
import { useWebTheme } from '../../../theme';
import type { Theme } from '../../../../src/theme/use-theme';

interface IProgress {
	task: ITeamTask;
	percent: () => number;
}

interface ProgressBarColors {
	fill: string;
	track: string;
}

/**
 * The web's progress bar: the success color on a track of the foreground at 10%, from the theme in both modes. A task
 * without an estimate counts as none, and its fill keeps the track's color.
 */
export function progressBarColorsOf(task: ITeamTask | undefined, theme: Theme): ProgressBarColors {
	const track = theme.foreground(10);
	const hasEstimate = (task?.estimate ?? 0) > 0;
	if (hasEstimate) {
		return { fill: theme.colors.success, track };
	}
	return { fill: track, track };
}

export const Progress: React.FC<IProgress> = ({ task, percent }) => {
	const theme = useWebTheme();
	const colors = progressBarColorsOf(task, theme);
	return (
		<View style={styles.progressBarContainer}>
			<View style={{ width: '79%' }}>
				<ProgressBar
					style={[styles.progressBar, { backgroundColor: colors.track }]}
					progress={percent()}
					color={colors.fill}
				/>
			</View>
			<Text style={[styles.percent, { color: theme.colors['muted-foreground'] }]}>
				{Math.floor(percent() * 100)}%
			</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	percent: {
		fontSize: 12
	},
	progressBar: { borderRadius: 3, height: 6, width: '100%' },
	progressBarContainer: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingRight: 12
	}
});
