import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TaskPropertyPlaceholderIcon } from '../../src/components/task-property-icon';
import { translate } from '../i18n';
import { typography } from '../theme';

interface IEmptyStatus {
	iconsOnly: boolean;
	ink: string;
	/** The ring's color where only icons show. */
	faintInk: string;
}

/** A status chip without a status: the web's dashed ring, and its name unless only icons show. */
export function EmptyStatus({ iconsOnly, ink, faintInk }: Readonly<IEmptyStatus>) {
	if (iconsOnly) {
		return <TaskPropertyPlaceholderIcon kind="status" size={14} color={faintInk} />;
	}
	return (
		<View style={styles.empty}>
			<TaskPropertyPlaceholderIcon kind="status" size={12} color={ink} />
			<Text style={[styles.name, { color: ink }]}>{translate('settingScreen.statusScreen.statuses')}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	empty: {
		alignItems: 'center',
		flexDirection: 'row'
	},
	name: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 10,
		marginLeft: 5,
		textTransform: 'capitalize'
	}
});
