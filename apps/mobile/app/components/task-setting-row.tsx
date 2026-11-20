import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useWebTheme } from '../theme';
import LabelItem from './label-item';
import { formatName } from '../helpers/name-format';
import { readOnlyOpacity } from '../helpers/read-only-opacity';

const ACTION_ICON_SIZE = 18;
const ACTION_HIT_SLOP = 12;

interface ITaskSettingRow {
	name: string;
	color?: string | null;
	iconUrl?: string | null;
	onEdit: () => unknown;
	onDelete: () => unknown;
	/** Shows the edit and delete actions disabled, for a user who may not change this setting. */
	readOnly?: boolean;
}

/** No press handler on a read-only row: it never relies on the icons honoring `disabled`. */
function pressOf(readOnly: boolean, action: () => unknown) {
	if (readOnly) {
		return undefined;
	}
	return () => action();
}

/** A status, priority, size, label or version in its settings list: the web's chip, then a quiet edit and delete. */
const TaskSettingRow: FC<ITaskSettingRow> = ({ name, color, iconUrl, onEdit, onDelete, readOnly = false }) => {
	const theme = useWebTheme();
	return (
		<View testID="task-setting-row" style={styles.row}>
			<View style={styles.chip}>
				<LabelItem
					label={formatName(name)}
					background={color ?? ''}
					icon={undefined}
					iconUrl={iconUrl ?? undefined}
				/>
			</View>
			<View style={[styles.actions, { opacity: readOnlyOpacity(readOnly) }]}>
				<AntDesign
					size={ACTION_ICON_SIZE}
					name="edit"
					color={theme.colors['muted-foreground']}
					accessibilityRole="button"
					accessibilityState={{ disabled: readOnly }}
					disabled={readOnly}
					hitSlop={ACTION_HIT_SLOP}
					onPress={pressOf(readOnly, onEdit)}
				/>
				<Ionicons
					name="trash-outline"
					size={ACTION_ICON_SIZE}
					color={theme.colors['destructive-ink']}
					accessibilityRole="button"
					accessibilityState={{ disabled: readOnly }}
					disabled={readOnly}
					hitSlop={ACTION_HIT_SLOP}
					onPress={pressOf(readOnly, onDelete)}
				/>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	actions: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 20
	},
	chip: {
		flexShrink: 1
	},
	row: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 12,
		justifyContent: 'space-between',
		minHeight: 56,
		paddingHorizontal: 16,
		paddingVertical: 10
	}
});

export default TaskSettingRow;
