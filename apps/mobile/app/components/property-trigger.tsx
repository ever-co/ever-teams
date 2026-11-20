import React, { type ComponentProps, type RefObject } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import { ChevronDown } from '../../src/components/icons';
import { ChipIcon } from '../../src/components/chip-icon';
import { TaskPropertyKind, TaskPropertyPlaceholderIcon } from '../../src/components/task-property-icon';
import { taskChipLookOf } from '../../src/components/task-chip';
import { dataColorChipOf } from '../../src/theme/data-color';
import type { Theme } from '../../src/theme/use-theme';
import { typography, useWebTheme } from '../theme';

const TRIGGER_HEIGHT = 28;
const GLYPH_SIZE = 14;
const CHIP_RADIUS = 6;
const PILL_SHADOW = '0 1px 1px rgba(0, 0, 0, 0.04)';

type TriggerItem = ComponentProps<typeof ChipIcon>['item'];

export interface PropertyTriggerLook {
	container: ViewStyle;
	text: TextStyle;
	ink: string;
}

function pillOf(theme: Theme): ViewStyle {
	return {
		backgroundColor: theme.colors.card,
		borderColor: theme.colors.border,
		borderRadius: TRIGGER_HEIGHT / 2,
		borderWidth: StyleSheet.hairlineWidth,
		boxShadow: PILL_SHADOW,
		paddingHorizontal: 10
	};
}

function valueTextOf(ink: string): TextStyle {
	return { color: ink, fontFamily: typography.primary.medium, fontSize: 12, textTransform: 'capitalize' };
}

/**
 * The web's trigger of a task property on the task page: a value with a color draws its chip-3d, rounded 6; a value
 * without one, the pill with its name in the foreground; an empty property, the pill with the field's name muted.
 */
export function propertyTriggerLookOf(item: TriggerItem | null | undefined, theme: Theme): PropertyTriggerLook {
	if (!item) {
		const muted = theme.colors['muted-foreground'];
		return {
			container: pillOf(theme),
			text: { color: muted, fontFamily: typography.primary.normal, fontSize: 13 },
			ink: muted
		};
	}
	const isPainted = dataColorChipOf(item.bgColor, theme.scheme) !== null;
	if (isPainted) {
		const chip = taskChipLookOf(item.bgColor, theme);
		return {
			container: { ...chip.container, borderRadius: CHIP_RADIUS, paddingHorizontal: 8 },
			text: valueTextOf(chip.ink),
			ink: chip.ink
		};
	}
	const foreground = theme.colors.foreground;
	return { container: pillOf(theme), text: valueTextOf(foreground), ink: foreground };
}

interface IPropertyTrigger {
	kind: TaskPropertyKind;
	/** The property's value; nothing while it is empty. */
	item?: TriggerItem | null;
	/** The field's name, shown while the property is empty. */
	placeholder: string;
}

function TriggerGlyph({ kind, item, ink }: Readonly<Omit<IPropertyTrigger, 'placeholder'> & { ink: string }>) {
	if (item) {
		return <ChipIcon item={item} color={ink} kind={kind} size={GLYPH_SIZE} />;
	}
	return <TaskPropertyPlaceholderIcon kind={kind} size={GLYPH_SIZE} color={ink} />;
}

/** A task property as the web's task page shows it: its glyph, its name and the chevron of its menu. */
export function PropertyTrigger({ kind, item, placeholder }: Readonly<IPropertyTrigger>) {
	const theme = useWebTheme();
	const look = propertyTriggerLookOf(item, theme);
	return (
		<View testID={`property-trigger-${kind}`} style={[styles.trigger, look.container]}>
			<TriggerGlyph kind={kind} item={item} ink={look.ink} />
			<Text numberOfLines={1} style={[styles.name, look.text]}>
				{item?.name ?? placeholder}
			</Text>
			<View testID="property-trigger-chevron" style={styles.chevron}>
				<ChevronDown size={GLYPH_SIZE} color={look.ink} />
			</View>
		</View>
	);
}

interface IPropertyTriggerButton extends IPropertyTrigger {
	/** Where the property's menu opens. */
	anchorRef: RefObject<View | null>;
	onPress: () => unknown;
}

/** The trigger as a button, as wide as its content, as the web's task page draws it. */
export function PropertyTriggerButton({ anchorRef, onPress, ...trigger }: Readonly<IPropertyTriggerButton>) {
	return (
		<TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => onPress()}>
			<View ref={anchorRef} collapsable={false}>
				<PropertyTrigger {...trigger} />
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	button: {
		alignSelf: 'flex-start',
		maxWidth: '100%'
	},
	chevron: {
		opacity: 0.6
	},
	name: {
		flexShrink: 1
	},
	trigger: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 6,
		height: TRIGGER_HEIGHT,
		maxWidth: '100%'
	}
});
