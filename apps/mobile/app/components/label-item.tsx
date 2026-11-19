import React, { FC, ReactNode } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useWebTheme } from '../theme';
import { taskChipLookOf } from '../../src/components/task-chip';

interface Props {
	label: string;
	background: string;
	icon: ReactNode | undefined;
}

/** A status, priority, size or label shown on a card or a list: the web's chip of its color. */
const LabelItem: FC<Props> = ({ label, background, icon }) => {
	const theme = useWebTheme();
	const look = taskChipLookOf(background, theme);
	return (
		<View testID="task-chip" style={[styles.container, look.container]}>
			{icon}
			<Text style={[styles.labelTitle, { color: look.ink }]} numberOfLines={1}>
				{label}
			</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		borderRadius: 8,
		flexDirection: 'row',
		gap: 5,
		minHeight: 24,
		paddingHorizontal: 8,
		paddingVertical: 3
	},
	labelTitle: {
		fontSize: 12,
		fontWeight: '500',
		textTransform: 'capitalize'
	}
});

export default LabelItem;
