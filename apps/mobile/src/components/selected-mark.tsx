import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Check } from './icons';
import { taskChipLookOf } from './task-chip';
import { useWebTheme } from '../../app/theme';

const MARK_SIZE = 18;
const CHECK_SIZE = 12;
const CHECK_STROKE = 2.5;

/** The web's mark of a selected option (selected-mark.tsx): a round chip-3d of the primary color around a check. */
export function SelectedMark() {
	const theme = useWebTheme();
	const look = taskChipLookOf(theme.colors.primary, theme);
	return (
		<View testID="selected-mark" style={[styles.mark, look.container]}>
			<Check size={CHECK_SIZE} strokeWidth={CHECK_STROKE} color={look.ink} />
		</View>
	);
}

const styles = StyleSheet.create({
	mark: {
		alignItems: 'center',
		borderRadius: MARK_SIZE / 2,
		height: MARK_SIZE,
		justifyContent: 'center',
		width: MARK_SIZE
	}
});
