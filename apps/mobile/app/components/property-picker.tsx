import React, { ReactNode } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from '../../src/components/icons';
import { typography, useWebTheme } from '../theme';
import LabelItem from './label-item';
import { TaskSettingAddButton } from './task-setting-add-button';
import { readOnlyOpacity } from '../helpers/read-only-opacity';
import { dialogLookOf, dialogOverlayColor } from '../../src/theme/dialog-look';
import { settingsDividerOf } from '../../src/theme/settings-look';
import type { Theme } from '../../src/theme/use-theme';
import { ChipIcon } from '../../src/components/chip-icon';
import type { MenuRect } from '../../src/components/menu-placement';
import type { TaskPropertyKind } from '../../src/components/task-property-icon';
import { MENU_ICON_SIZE } from '../../src/theme/menu-look';
import { MenuOption, PropertyMenu } from './property-menu';
import { PickerForm } from './picker-form';

const CHECK_SIZE = 18;
const CREATE_ICON_SIZE = 18;

export interface PickerOption {
	key: string;
	name: string;
	color?: string | null;
	icon?: ReactNode;
	iconUrl?: string;
	/** What the value is, so a menu row draws the web's glyph for it. */
	kind?: TaskPropertyKind;
	/** The icon the value was saved with, as Gauzy stores it. */
	storedIcon?: string;
	/** The value the task holds now. */
	isSelected: boolean;
}

interface IPropertyPicker {
	visible: boolean;
	onDismiss: () => unknown;
	title: string;
	options: PickerOption[];
	onSelect: (option: PickerOption) => unknown;
	/** Under the list: the create button and its hint. */
	footer?: ReactNode;
	/** Shown in place of the list, such as the form that creates a value. */
	children?: ReactNode;
	/** The chip that opened the picker, on the screen: the values then show in the web's menu under it. */
	anchor?: MenuRect | null;
	/** The search line of the menu. */
	searchPlaceholder?: string;
	/** Names shown as they were saved, as labels are, where statuses, priorities and sizes are capitalized. */
	keepsCase?: boolean;
}

interface PickerMenuOption extends MenuOption {
	option: PickerOption;
}

/** A value as a menu row: the web's glyph for it in the menu's size, its name, checked when the task holds it. */
function menuOptionOf(option: PickerOption, theme: Theme): PickerMenuOption {
	const iconItem = {
		name: option.name,
		bgColor: option.color ?? undefined,
		iconUrl: option.iconUrl,
		storedIcon: option.storedIcon,
		icon: option.icon
	};
	return {
		key: option.key,
		label: option.name,
		icon: (
			<ChipIcon
				item={iconItem}
				color={theme.colors['muted-foreground']}
				kind={option.kind}
				size={MENU_ICON_SIZE}
			/>
		),
		isSelected: option.isSelected,
		option
	};
}

/** The chip a menu opens under: none while a form shows in place of the values, or for a picker without one. */
function menuAnchorOf(showsList: boolean, anchor: MenuRect | null | undefined): MenuRect | null {
	if (!showsList) {
		return null;
	}
	return anchor ?? null;
}

function rowBackgroundOf(pressed: boolean, theme: Theme): string {
	if (pressed) {
		return theme.foreground(5);
	}
	return 'transparent';
}

function PickerDivider() {
	return <View style={settingsDividerOf(useWebTheme())} />;
}

/** One value to pick: its chip, then a check in primary on the value the task holds. */
function PickerRow({
	option,
	onSelect
}: Readonly<{ option: PickerOption; onSelect: (option: PickerOption) => unknown }>) {
	const theme = useWebTheme();
	return (
		<Pressable
			testID="picker-option"
			accessibilityRole="button"
			accessibilityLabel={option.name}
			accessibilityState={{ selected: option.isSelected }}
			onPress={() => onSelect(option)}
			style={({ pressed }) => [styles.row, { backgroundColor: rowBackgroundOf(pressed, theme) }]}
		>
			<View style={styles.chip}>
				<LabelItem
					label={option.name}
					background={option.color ?? ''}
					icon={option.icon}
					iconUrl={option.iconUrl}
				/>
			</View>
			{option.isSelected && <Check size={CHECK_SIZE} color={theme.colors.primary} />}
		</Pressable>
	);
}

interface IPickerCreateFooter {
	label: string;
	canCreate: boolean;
	readOnlyHint: string;
	onPress: () => unknown;
}

/** The create button under a picker's values: read-only, with its hint, for someone who may not create one. */
export function PickerCreateFooter({ label, canCreate, readOnlyHint, onPress }: Readonly<IPickerCreateFooter>) {
	const theme = useWebTheme();
	const readOnly = !canCreate;
	return (
		<View style={styles.footer}>
			<TaskSettingAddButton
				label={label}
				iconSize={CREATE_ICON_SIZE}
				disabled={readOnly}
				style={[styles.create, { opacity: readOnlyOpacity(readOnly) }]}
				textStyle={styles.createText}
				onPress={() => onPress()}
			/>
			{readOnly && <Text style={[styles.hint, { color: theme.colors['muted-foreground'] }]}>{readOnlyHint}</Text>}
		</View>
	);
}

/**
 * A task's status, priority or size to pick. Opened from a chip, in the web's menu under it. Without one, or while a
 * form shows in place of the values, in the web's dialog over a quiet overlay: the values as rows of their chips, the
 * one the task holds checked. A tap outside, back, or VoiceOver's escape closes it. The overlay and the dialog stay
 * out of the accessibility tree, so a screen reader reaches each row on its own. Both are drawn in one modal, so going
 * from the menu to a form never opens a second one.
 */
export function PropertyPicker({
	visible,
	onDismiss,
	title,
	options,
	onSelect,
	footer,
	children,
	anchor,
	searchPlaceholder,
	keepsCase = false
}: Readonly<IPropertyPicker>) {
	const theme = useWebTheme();
	const showsList = !children;
	const menuAnchor = menuAnchorOf(showsList, anchor);

	if (menuAnchor) {
		return (
			<Modal animationType="fade" transparent visible={visible} onRequestClose={() => onDismiss()}>
				<PropertyMenu
					anchor={menuAnchor}
					options={options.map((option) => menuOptionOf(option, theme))}
					onSelect={(row) => onSelect(row.option)}
					onDismiss={onDismiss}
					searchPlaceholder={searchPlaceholder ?? title}
					footer={footer}
					capitalizesLabels={!keepsCase}
				/>
			</Modal>
		);
	}

	return (
		<Modal animationType="fade" transparent visible={visible} onRequestClose={() => onDismiss()}>
			<Pressable
				testID="picker-overlay"
				accessible={false}
				onAccessibilityEscape={() => onDismiss()}
				style={styles.overlay}
				onPress={() => onDismiss()}
			>
				<Pressable
					testID="picker-dialog"
					accessible={false}
					style={[styles.dialog, dialogLookOf(theme)]}
					onPress={() => undefined}
				>
					{showsList && (
						<>
							<Text style={[styles.title, { color: theme.colors.foreground }]}>{title}</Text>
							<FlatList
								style={styles.list}
								data={options}
								keyExtractor={(option) => option.key}
								ItemSeparatorComponent={PickerDivider}
								renderItem={({ item }) => <PickerRow option={item} onSelect={onSelect} />}
							/>
							{footer}
						</>
					)}
					{!showsList && <PickerForm>{children}</PickerForm>}
				</Pressable>
			</Pressable>
		</Modal>
	);
}

const styles = StyleSheet.create({
	chip: {
		flexShrink: 1
	},
	create: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 6,
		justifyContent: 'center',
		minHeight: 40,
		paddingHorizontal: 16
	},
	createText: {
		fontFamily: typography.primary.semiBold,
		fontSize: 14
	},
	// a form shown in place of the values has square corners of its own
	dialog: {
		maxHeight: '75%',
		maxWidth: 420,
		overflow: 'hidden',
		paddingBottom: 16,
		paddingTop: 20,
		width: '90%'
	},
	footer: {
		gap: 8,
		paddingHorizontal: 20,
		paddingTop: 12
	},
	hint: {
		fontFamily: typography.primary.medium,
		fontSize: 12,
		textAlign: 'center'
	},
	list: {
		flexGrow: 0
	},
	overlay: {
		alignItems: 'center',
		backgroundColor: dialogOverlayColor,
		flex: 1,
		justifyContent: 'center'
	},
	row: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 12,
		justifyContent: 'space-between',
		minHeight: 48,
		paddingHorizontal: 20
	},
	title: {
		fontFamily: typography.primary.semiBold,
		fontSize: 15,
		marginBottom: 8,
		paddingHorizontal: 20
	}
});
