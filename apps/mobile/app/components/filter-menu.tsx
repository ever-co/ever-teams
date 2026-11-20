import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronRight, X } from '../../src/components/icons';
import { ChipIcon } from '../../src/components/chip-icon';
import type { MenuRect } from '../../src/components/menu-placement';
import { submenuPlacementOf } from '../../src/components/menu-placement';
import { TaskPropertyKind, TaskPropertyPlaceholderIcon } from '../../src/components/task-property-icon';
import {
	countChipLookOf,
	MENU_ICON_SIZE,
	MENU_LIST_PADDING,
	MENU_ROW_HEIGHT,
	MENU_ROW_RADIUS,
	MENU_TEXT_SIZE,
	menuRowBackgroundOf,
	raisedSurfaceOf
} from '../../src/theme/menu-look';
import { translate } from '../i18n';
import { typography, useWebTheme } from '../theme';
import type { Theme } from '../../src/theme/use-theme';
import { menuLimitsOn, placementOnArea, useMenuArea } from './property-menu';

/** The web's filter menu (property-filter-menu.tsx): 224 wide, its end on the Filter button's, 6 below it. */
export const FILTER_MENU_WIDTH = 224;
const FILTER_MENU_OFFSET = 6;
/** Its submenus are 192 wide and scroll past 320. */
export const FILTER_SUBMENU_WIDTH = 192;
const FILTER_SUBMENU_MAX_HEIGHT = 320;
const SEPARATOR_HEIGHT = 1 + 2 * MENU_LIST_PADDING;

export interface FilterOption {
	value: string;
	name: string;
	color?: string | null;
	iconUrl?: string;
	storedIcon?: string;
}

export interface FilterCategory<F extends string> {
	field: F;
	kind: TaskPropertyKind;
	label: string;
	options: FilterOption[];
	/** Names written by people keep their own case; property values are capitalized. */
	keepsCase?: boolean;
}

export type FilterSelection<F extends string> = Partial<Record<F, string[]>>;

/** How many values the filters hold in all, shown on the Filter button. */
export function activeFilterCountOf<F extends string>(selection: FilterSelection<F>): number {
	let count = 0;
	for (const values of Object.values<string[] | undefined>(selection)) {
		count += values?.length ?? 0;
	}
	return count;
}

/** The values with this one added, or taken away when it was there. */
export function toggledValues(values: string[], value: string): string[] {
	const isHeld = values.includes(value);
	if (isHeld) {
		return values.filter((held) => held !== value);
	}
	return [...values, value];
}

function selectedValuesOf<F extends string>(selection: FilterSelection<F>, field: F): string[] {
	return selection[field] ?? [];
}

/** The menu's own height: its rows, and the separator and Clear filters when a filter is on. */
function menuHeightOf(categoryCount: number, hasActiveFilters: boolean) {
	const rowsHeight = categoryCount * MENU_ROW_HEIGHT + 2 * MENU_LIST_PADDING;
	if (!hasActiveFilters) {
		return rowsHeight;
	}
	return rowsHeight + SEPARATOR_HEIGHT + MENU_ROW_HEIGHT;
}

function submenuHeightOf(optionCount: number) {
	const listHeight = optionCount * MENU_ROW_HEIGHT + 2 * MENU_LIST_PADDING;
	return Math.min(listHeight, FILTER_SUBMENU_MAX_HEIGHT);
}

function rowBackgroundOf(pressed: boolean, isOpen: boolean, theme: Theme) {
	return menuRowBackgroundOf(pressed || isOpen, theme);
}

function CountChip({ count }: Readonly<{ count: number }>) {
	const theme = useWebTheme();
	const look = countChipLookOf(theme);
	return (
		<View style={[styles.countChip, look.container]}>
			<Text style={[styles.countText, look.text]}>{count}</Text>
		</View>
	);
}

interface ICategoryRow {
	label: string;
	kind: TaskPropertyKind;
	count: number;
	isOpen: boolean;
	isDisabled: boolean;
	onPress: () => unknown;
}

/** A property to filter by: its placeholder glyph, its name, how many values it holds, and its submenu's chevron. */
function CategoryRow({ label, kind, count, isOpen, isDisabled, onPress }: Readonly<ICategoryRow>) {
	const theme = useWebTheme();
	const hasCount = count > 0;
	return (
		<Pressable
			testID="filter-category"
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ expanded: isOpen, disabled: isDisabled }}
			disabled={isDisabled}
			onPress={() => onPress()}
			style={({ pressed }) => [
				styles.row,
				isDisabled && styles.disabled,
				{ backgroundColor: rowBackgroundOf(pressed, isOpen, theme) }
			]}
		>
			<TaskPropertyPlaceholderIcon kind={kind} size={MENU_ICON_SIZE} />
			<Text numberOfLines={1} style={[styles.rowLabel, { color: theme.colors.foreground }]}>
				{label}
			</Text>
			{hasCount && <CountChip count={count} />}
			<ChevronRight size={MENU_ICON_SIZE} color={theme.colors['muted-foreground']} />
		</Pressable>
	);
}

interface IOptionRow {
	option: FilterOption;
	kind: TaskPropertyKind;
	isChecked: boolean;
	keepsCase: boolean;
	onPress: () => unknown;
}

/** A value to filter by: its glyph, its name, and a check while the filter holds it. */
function OptionRow({ option, kind, isChecked, keepsCase, onPress }: Readonly<IOptionRow>) {
	const theme = useWebTheme();
	const iconItem = {
		name: option.name,
		bgColor: option.color ?? undefined,
		iconUrl: option.iconUrl,
		storedIcon: option.storedIcon
	};
	return (
		<Pressable
			testID="filter-option"
			accessibilityRole="checkbox"
			accessibilityLabel={option.name}
			accessibilityState={{ checked: isChecked }}
			onPress={() => onPress()}
			style={({ pressed }) => [styles.row, { backgroundColor: menuRowBackgroundOf(pressed, theme) }]}
		>
			<ChipIcon item={iconItem} color={theme.colors['muted-foreground']} kind={kind} size={MENU_ICON_SIZE} />
			<Text
				numberOfLines={1}
				style={[styles.rowLabel, !keepsCase && styles.capitalized, { color: theme.colors.foreground }]}
			>
				{option.name}
			</Text>
			{isChecked && <Check size={MENU_ICON_SIZE} color={theme.colors.primary} />}
		</Pressable>
	);
}

interface IFilterMenu<F extends string> {
	/** The Filter button, in window coordinates. */
	anchor: MenuRect;
	categories: FilterCategory<F>[];
	selection: FilterSelection<F>;
	onChange: (field: F, values: string[]) => unknown;
	onClear: () => unknown;
	onDismiss: () => unknown;
}

/**
 * A task filter as the web's filter menu: one row per property with the count it holds, a submenu of its values
 * beside the menu, each value checked or unchecked at once, and Clear filters while one is on. A tap outside, back,
 * or VoiceOver's escape closes it.
 */
export function FilterMenu<F extends string>({
	anchor,
	categories,
	selection,
	onChange,
	onClear,
	onDismiss
}: Readonly<IFilterMenu<F>>) {
	const theme = useWebTheme();
	const { areaRef, area, measureArea, context } = useMenuArea();
	const [openField, setOpenField] = useState<F | null>(null);
	const activeCount = activeFilterCountOf(selection);
	const hasActiveFilters = activeCount > 0;
	const menuHeight = menuHeightOf(categories.length, hasActiveFilters);
	const openIndex = categories.findIndex((category) => category.field === openField);
	const openCategory = categories[openIndex];

	let menuStyle = {};
	let submenuStyle = {};
	if (area !== null) {
		const shape = { width: FILTER_MENU_WIDTH, align: 'end' as const, offset: FILTER_MENU_OFFSET };
		const placement = placementOnArea(area, anchor, menuHeight, context, shape);
		menuStyle = placement;
		if (openCategory) {
			const menuRect = { x: placement.left, y: placement.top, width: placement.width, height: menuHeight };
			const rowTop = placement.top + MENU_LIST_PADDING + openIndex * MENU_ROW_HEIGHT;
			const row = { x: placement.left, y: rowTop, width: placement.width, height: MENU_ROW_HEIGHT };
			const submenuHeight = submenuHeightOf(openCategory.options.length);
			const limits = menuLimitsOn(area, context);
			submenuStyle = submenuPlacementOf(menuRect, row, submenuHeight, limits, FILTER_SUBMENU_WIDTH);
		}
	}
	const isMeasured = area !== null;

	const toggleOption = (category: FilterCategory<F>, option: FilterOption) => {
		const values = selectedValuesOf(selection, category.field);
		onChange(category.field, toggledValues(values, option.value));
	};

	return (
		// VoiceOver's escape goes up from the row it is on: the area holds the rows, the backdrop none
		<View
			ref={areaRef}
			collapsable={false}
			style={styles.area}
			onLayout={measureArea}
			onAccessibilityEscape={() => onDismiss()}
		>
			<Pressable
				testID="menu-backdrop"
				accessible={false}
				style={StyleSheet.absoluteFill}
				onPress={() => onDismiss()}
			/>
			<View
				testID="filter-menu"
				style={[
					styles.menu,
					styles.menuContent,
					raisedSurfaceOf(theme),
					menuStyle,
					!isMeasured && styles.measuring
				]}
			>
				{categories.map((category) => (
					<CategoryRow
						key={category.field}
						label={category.label}
						kind={category.kind}
						count={selectedValuesOf(selection, category.field).length}
						isOpen={category.field === openField}
						isDisabled={category.options.length === 0}
						onPress={() => setOpenField(category.field)}
					/>
				))}
				{hasActiveFilters && (
					<>
						<View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
						<Pressable
							testID="filter-clear"
							accessibilityRole="button"
							accessibilityLabel={translate('taskMenus.filter.clear')}
							onPress={() => onClear()}
							style={({ pressed }) => [
								styles.row,
								{ backgroundColor: menuRowBackgroundOf(pressed, theme) }
							]}
						>
							<X size={MENU_ICON_SIZE} color={theme.colors['muted-foreground']} />
							<Text numberOfLines={1} style={[styles.rowLabel, { color: theme.colors.foreground }]}>
								{translate('taskMenus.filter.clear')}
							</Text>
						</Pressable>
					</>
				)}
			</View>
			{openCategory && (
				<View
					testID="filter-submenu"
					style={[styles.menu, raisedSurfaceOf(theme), submenuStyle, !isMeasured && styles.measuring]}
				>
					<ScrollView style={styles.submenuList} contentContainerStyle={styles.menuContent}>
						{openCategory.options.map((option) => (
							<OptionRow
								key={option.value}
								option={option}
								kind={openCategory.kind}
								isChecked={selectedValuesOf(selection, openCategory.field).includes(option.value)}
								keepsCase={Boolean(openCategory.keepsCase)}
								onPress={() => toggleOption(openCategory, option)}
							/>
						))}
					</ScrollView>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	area: {
		flex: 1
	},
	capitalized: {
		textTransform: 'capitalize'
	},
	countChip: {
		borderRadius: 4,
		paddingHorizontal: 6
	},
	countText: {
		fontFamily: typography.primary.medium,
		fontSize: 12,
		fontVariant: ['tabular-nums']
	},
	disabled: {
		opacity: 0.5
	},
	// measured once on screen before it shows, so it never jumps into place
	measuring: {
		opacity: 0
	},
	menu: {
		overflow: 'hidden',
		position: 'absolute'
	},
	menuContent: {
		padding: MENU_LIST_PADDING
	},
	row: {
		alignItems: 'center',
		borderRadius: MENU_ROW_RADIUS,
		flexDirection: 'row',
		gap: 8,
		height: MENU_ROW_HEIGHT,
		paddingHorizontal: 8
	},
	rowLabel: {
		flex: 1,
		fontFamily: typography.primary.normal,
		fontSize: MENU_TEXT_SIZE
	},
	separator: {
		height: 1,
		marginHorizontal: -MENU_LIST_PADDING,
		marginVertical: MENU_LIST_PADDING
	},
	submenuList: {
		maxHeight: FILTER_SUBMENU_MAX_HEIGHT
	}
});
