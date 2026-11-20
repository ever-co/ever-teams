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

const CHECK_SIZE = 18;
const CREATE_ICON_SIZE = 18;

export interface PickerOption {
	key: string;
	name: string;
	color?: string | null;
	icon?: ReactNode;
	iconUrl?: string;
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
 * A task's status, priority or size to pick, in the web's dialog over a quiet overlay: the values as rows of their
 * chips, the one the task holds checked. A tap outside, back, or VoiceOver's escape closes it. The overlay and the
 * dialog stay out of the accessibility tree, so a screen reader reaches each row on its own.
 */
export function PropertyPicker({
	visible,
	onDismiss,
	title,
	options,
	onSelect,
	footer,
	children
}: Readonly<IPropertyPicker>) {
	const theme = useWebTheme();
	const showsList = !children;

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
					{children}
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
	dialog: {
		maxHeight: '75%',
		maxWidth: 420,
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
