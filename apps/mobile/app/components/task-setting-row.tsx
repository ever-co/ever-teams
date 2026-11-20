import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MoreHorizontal, Pencil, Trash } from '../../src/components/icons';
import { ChipIcon } from '../../src/components/chip-icon';
import type { TaskPropertyKind } from '../../src/components/task-property-icon';
import { useMenuAnchor } from '../../src/components/menu-anchor';
import { menuRowBackgroundOf } from '../../src/theme/menu-look';
import { typography, useWebTheme } from '../theme';
import { translate } from '../i18n';
import { ActionsMenu } from './actions-menu';
import { taskSettingsReadOnlyHint } from '../services/hooks/features/task-settings-read-only';
import type { MenuActionItem } from './actions-menu';

const GLYPH_SIZE = 16;
const MORE_BUTTON_SIZE = 28;
// the button is 28, as the web's; the slop makes it a 44 target
const MORE_HIT_SLOP = 8;

interface ITaskSettingRow {
	kind: TaskPropertyKind;
	/** Shown as given: each list formats its own names, a label keeps the one it was saved with. */
	name: string;
	color?: string | null;
	iconUrl?: string | null;
	/** The icon the value was saved with, as Gauzy stores it: an icon of its own is drawn in place of the glyph. */
	storedIcon?: string;
	onEdit: () => unknown;
	onDelete: () => unknown;
	/** Lists edit and delete disabled under the reason, for a user who may not change this setting. */
	readOnly?: boolean;
}

function actionsOf(onEdit: () => unknown, onDelete: () => unknown, readOnly: boolean): MenuActionItem[] {
	return [
		{ key: 'edit', label: translate('common.edit'), icon: Pencil, onPress: onEdit, disabled: readOnly },
		{
			key: 'delete',
			label: translate('settingScreen.membersSettingsScreen.delete'),
			icon: Trash,
			onPress: onDelete,
			tone: 'destructive',
			disabled: readOnly,
			separated: true
		}
	];
}

function readOnlyHintOf(readOnly: boolean): string | undefined {
	if (!readOnly) {
		return undefined;
	}
	return taskSettingsReadOnlyHint();
}

/**
 * A status, priority, size, label or version in its settings list, as the web's row: its glyph, its name, and the
 * "…" that opens its Edit and Delete menu.
 */
function TaskSettingRow({
	kind,
	name,
	color,
	iconUrl,
	storedIcon,
	onEdit,
	onDelete,
	readOnly = false
}: Readonly<ITaskSettingRow>) {
	const theme = useWebTheme();
	const [isMenuOpen, setMenuOpen] = useState(false);
	const { anchorRef, anchor, openFromAnchor } = useMenuAnchor();
	const iconItem = { name, bgColor: color ?? undefined, iconUrl: iconUrl ?? undefined, storedIcon };
	const closeMenu = () => setMenuOpen(false);
	const showsMenu = isMenuOpen && anchor !== null;

	return (
		<View testID="task-setting-row" style={styles.row}>
			<ChipIcon item={iconItem} color={theme.colors['muted-foreground']} kind={kind} size={GLYPH_SIZE} />
			<Text numberOfLines={1} style={[styles.name, { color: theme.colors.foreground }]}>
				{name}
			</Text>
			<Pressable
				ref={anchorRef}
				testID="task-setting-actions"
				accessibilityRole="button"
				accessibilityLabel={translate('taskMenus.rowActions', { name })}
				accessibilityState={{ expanded: showsMenu }}
				hitSlop={MORE_HIT_SLOP}
				onPress={() => openFromAnchor(() => setMenuOpen(true))}
				style={({ pressed }) => [styles.more, { backgroundColor: menuRowBackgroundOf(pressed, theme) }]}
			>
				<MoreHorizontal size={GLYPH_SIZE} color={theme.colors['muted-foreground']} />
			</Pressable>
			<Modal animationType="fade" transparent visible={showsMenu} onRequestClose={closeMenu}>
				{anchor && (
					<ActionsMenu
						anchor={anchor}
						actions={actionsOf(onEdit, onDelete, readOnly)}
						hint={readOnlyHintOf(readOnly)}
						onDismiss={closeMenu}
					/>
				)}
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	more: {
		alignItems: 'center',
		borderRadius: 6,
		height: MORE_BUTTON_SIZE,
		justifyContent: 'center',
		marginLeft: 'auto',
		width: MORE_BUTTON_SIZE
	},
	name: {
		flexShrink: 1,
		fontFamily: typography.primary.normal,
		fontSize: 13,
		textTransform: 'none'
	},
	row: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 12,
		minHeight: 40,
		paddingHorizontal: 16
	}
});

export default TaskSettingRow;
