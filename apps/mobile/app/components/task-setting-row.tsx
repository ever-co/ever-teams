import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Pencil, Trash } from '../../src/components/icons';
import { useWebTheme } from '../theme';
import { translate } from '../i18n';
import LabelItem from './label-item';
import { readOnlyOpacity } from '../helpers/read-only-opacity';

const ACTION_ICON_SIZE = 18;
const ACTION_HIT_SLOP = 12;

interface ITaskSettingRow {
	/** Shown as given: each list formats its own names, a label keeps the one it was saved with. */
	name: string;
	color?: string | null;
	iconUrl?: string | null;
	onEdit: () => unknown;
	onDelete: () => unknown;
	/** Shows the edit and delete actions disabled, for a user who may not change this setting. */
	readOnly?: boolean;
}

/** No press handler on a read-only row: it never relies on `disabled` alone. */
function pressOf(readOnly: boolean, action: () => unknown) {
	if (readOnly) {
		return undefined;
	}
	return () => action();
}

/** A status, priority, size, label or version in its settings list: the web's chip, then a quiet edit and delete. */
function TaskSettingRow({ name, color, iconUrl, onEdit, onDelete, readOnly = false }: Readonly<ITaskSettingRow>) {
	const theme = useWebTheme();
	return (
		<View testID="task-setting-row" style={styles.row}>
			<View style={styles.chip}>
				<LabelItem
					label={name}
					background={color ?? ''}
					icon={undefined}
					iconUrl={iconUrl ?? undefined}
					keepsCase
				/>
			</View>
			<View style={[styles.actions, { opacity: readOnlyOpacity(readOnly) }]}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`${translate('common.edit')} ${name}`}
					accessibilityState={{ disabled: readOnly }}
					disabled={readOnly}
					hitSlop={ACTION_HIT_SLOP}
					onPress={pressOf(readOnly, onEdit)}
				>
					<Pencil size={ACTION_ICON_SIZE} color={theme.colors['muted-foreground']} />
				</Pressable>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`${translate('settingScreen.membersSettingsScreen.delete')} ${name}`}
					accessibilityState={{ disabled: readOnly }}
					disabled={readOnly}
					hitSlop={ACTION_HIT_SLOP}
					onPress={pressOf(readOnly, onDelete)}
				>
					<Trash size={ACTION_ICON_SIZE} color={theme.colors['destructive-ink']} />
				</Pressable>
			</View>
		</View>
	);
}

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
