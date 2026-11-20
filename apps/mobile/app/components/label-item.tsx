import React, { FC, ReactNode } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useWebTheme } from '../theme';
import { taskChipLookOf } from '../../src/components/task-chip';
import { ChipIcon } from '../../src/components/chip-icon';
import type { TaskPropertyKind } from '../../src/components/task-property-icon';

interface Props {
	label: string;
	background: string;
	icon: ReactNode | undefined;
	iconUrl?: string;
	/** What the chip shows, so it draws the web's glyph for it. */
	kind?: TaskPropertyKind;
	/** The icon the value was saved with, as Gauzy stores it. */
	storedIcon?: string;
	/** Shows the name with the case it was saved with, where a card capitalizes it. */
	keepsCase?: boolean;
}

/** A status, priority, size or label shown on a card or a list: the web's chip of its color. */
const LabelItem: FC<Props> = ({ label, background, icon, iconUrl, kind, storedIcon, keepsCase = false }) => {
	const theme = useWebTheme();
	const look = taskChipLookOf(background, theme);
	const iconItem = { iconUrl, icon, name: label, bgColor: background, storedIcon };
	return (
		<View testID="task-chip" style={[styles.container, look.container]}>
			<ChipIcon item={iconItem} color={look.ink} kind={kind} />
			<Text style={[styles.labelTitle, keepsCase && styles.keptCase, { color: look.ink }]} numberOfLines={1}>
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
	keptCase: {
		textTransform: 'none'
	},
	labelTitle: {
		flexShrink: 1,
		fontSize: 12,
		fontWeight: '500',
		textTransform: 'capitalize'
	}
});

export default LabelItem;
