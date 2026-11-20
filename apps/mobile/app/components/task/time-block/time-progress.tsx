import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { ITeamTask } from '../../../services/interfaces/ITask';

interface IProgress {
	task: ITeamTask;
	percent: () => number;
}

/** The bar fills in green once the task has an estimate; a task without one counts as none. */
function barColorOf(task: ITeamTask | undefined): string {
	const hasEstimate = (task?.estimate ?? 0) > 0;
	if (hasEstimate) {
		return '#27AE60';
	}
	return '#F0F0F0';
}

export const Progress: React.FC<IProgress> = ({ task, percent }) => {
	return (
		<View style={styles.progressBarContainer}>
			<View style={{ width: '79%' }}>
				<ProgressBar style={styles.progressBar} progress={percent()} color={barColorOf(task)} />
			</View>
			<Text style={{ fontSize: 12, color: '#28204880' }}>{Math.floor(percent() * 100)}%</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	progressBar: { backgroundColor: '#E9EBF8', borderRadius: 3, height: 6, width: '100%' },
	progressBarContainer: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingRight: 12
	}
});
