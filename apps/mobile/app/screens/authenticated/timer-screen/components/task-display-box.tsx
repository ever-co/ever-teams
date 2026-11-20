import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Circle, CircleCheck } from '../../../../../src/components/icons';
import { typography, useAppTheme } from '../../../../theme';
import { translate } from '../../../../i18n';

type ITasDisplayBox = {
	count: number;
	openTask: boolean;
	selected: boolean;
};

const TaskDisplayBox = ({ count, openTask, selected }: ITasDisplayBox) => {
	const { colors } = useAppTheme();
	return (
		<View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.background }]}>
			{openTask ? (
				<>
					<Circle size={18} color="#9BD9B4" />
					<Text
						style={[
							styles.filterText,
							selected ? { color: colors.secondary, fontWeight: 'bold' } : { color: colors.tertiary }
						]}
					>
						{translate('tasksScreen.openCount', { count })}
					</Text>
				</>
			) : (
				<>
					<CircleCheck size={18} color="#BEBCC8" />
					<Text
						style={[
							styles.filterText,
							selected ? { color: colors.secondary, fontWeight: 'bold' } : { color: colors.tertiary }
						]}
					>
						{translate('tasksScreen.closedCount', { count })}
					</Text>
				</>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		borderRadius: 38,
		borderWidth: 1,
		flexDirection: 'row',
		height: 26,
		paddingLeft: 10,
		width: 110
	},
	filterText: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 11,
		left: 8
	}
});

export default TaskDisplayBox;
