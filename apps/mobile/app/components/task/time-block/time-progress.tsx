import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { ITeamTask } from '../../../services/interfaces/ITask';

interface IProgress {
	task: ITeamTask;
	percent: () => number;
}

export const Progress: React.FC<IProgress> = ({ task, percent }) => {
	return (
		<View style={styles.progressBarContainer}>
			<View style={{ width: '79%' }}>
				<ProgressBar
					style={styles.progressBar}
					progress={percent()}
					color={task && task.estimate > 0 ? '#27AE60' : '#F0F0F0'}
				/>
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
