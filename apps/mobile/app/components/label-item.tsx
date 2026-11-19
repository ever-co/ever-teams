import React, { FC, ReactNode } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useWebTheme } from '../theme';
import { taskChipLookOf } from '../../src/components/task-chip';
import { ChipIcon } from '../../src/components/chip-icon';

interface Props {
	label: string;
	background: string;
	icon: ReactNode | undefined;
	iconUrl?: string;
}

/** A status, priority, size or label shown on a card or a list: the web's chip of its color. */
const LabelItem: FC<Props> = ({ label, background, icon, iconUrl }) => {
	const theme = useWebTheme();
	const look = taskChipLookOf(background, theme);
	return (
		<View testID="task-chip" style={[styles.container, look.container]}>
			<ChipIcon item={{ iconUrl, icon }} color={look.ink} />
			<Text style={[styles.labelTitle, { color: look.ink }]} numberOfLines={1}>
				{label}
			</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	// a long label stays inside its card: the chip never passes the row's width and its name shrinks to one line
	container: {
		alignItems: 'center',
		borderRadius: 8,
		maxWidth: '100%',
		flexDirection: 'row',
		gap: 5,
		minHeight: 24,
		paddingHorizontal: 8,
		paddingVertical: 3
	},
	labelTitle: {
		flexShrink: 1,
		fontSize: 12,
		fontWeight: '500',
		textTransform: 'capitalize'
	}
});

export default LabelItem;
