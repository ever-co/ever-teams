import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check } from '../../src/components/icons';
import { menuPlacementOf, MenuRect } from '../../src/components/menu-placement';
import {
	MENU_ICON_SIZE,
	MENU_LIST_MAX_HEIGHT,
	MENU_LIST_PADDING,
	MENU_ROW_HEIGHT,
	MENU_ROW_RADIUS,
	MENU_SEARCH_HEIGHT,
	MENU_TEXT_SIZE,
	menuRowBackgroundOf,
	raisedSurfaceOf
} from '../../src/theme/menu-look';
import { translate } from '../i18n';
import { typography, useWebTheme } from '../theme';

export interface MenuOption {
	key: string;
	label: string;
	icon?: ReactNode;
	isSelected: boolean;
}

interface IPropertyMenu<T extends MenuOption> {
	/** The chip the menu opens under, in window coordinates. */
	anchor: MenuRect;
	options: T[];
	onSelect: (option: T) => unknown;
	onDismiss: () => unknown;
	searchPlaceholder: string;
	/** Under the list, over a hairline: the menu's actions. */
	footer?: ReactNode;
}

/** The screen the menu lives on, in window coordinates. */
export type MenuArea = MenuRect;

const SHOW_KEYBOARD = Platform.select({ ios: 'keyboardWillShow', default: 'keyboardDidShow' } as const);
const HIDE_KEYBOARD = Platform.select({ ios: 'keyboardWillHide', default: 'keyboardDidHide' } as const);

/** Where the keyboard starts on the screen while it shows, so the menu keeps above it. */
function useKeyboardTop(): number | null {
	const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
	useEffect(() => {
		const shown = Keyboard.addListener(SHOW_KEYBOARD, (event) => setKeyboardTop(event.endCoordinates.screenY));
		const hidden = Keyboard.addListener(HIDE_KEYBOARD, () => setKeyboardTop(null));
		return () => {
			shown.remove();
			hidden.remove();
		};
	}, []);
	return keyboardTop;
}

function matchesQuery(label: string, query: string): boolean {
	const normalizedLabel = label.toLowerCase();
	const normalizedQuery = query.trim().toLowerCase();
	return normalizedLabel.includes(normalizedQuery);
}

function emptyTextOf(hasOptions: boolean): string {
	if (hasOptions) {
		return translate('taskMenus.noResults');
	}
	return translate('taskMenus.noOptions');
}

/** The bottom of the area the menu may take: the area's own, or the top of the keyboard when it is higher. */
function areaBottomOf(area: MenuArea, keyboardTop: number | null): number {
	if (keyboardTop === null) {
		return area.height;
	}
	return Math.min(area.height, keyboardTop - area.y);
}

export interface MenuMeasures {
	anchor: MenuRect;
	listHeight: number;
	footerHeight: number;
	keyboardTop: number | null;
}

/** The menu's place on its area, from its chip and the height its search line, list and footer take. */
export function placementInArea(area: MenuArea, { anchor, listHeight, footerHeight, keyboardTop }: MenuMeasures) {
	const shownListHeight = Math.min(listHeight, MENU_LIST_MAX_HEIGHT);
	const menuHeight = MENU_SEARCH_HEIGHT + shownListHeight + footerHeight;
	const anchorInArea = { ...anchor, x: anchor.x - area.x, y: anchor.y - area.y };
	const bottom = areaBottomOf(area, keyboardTop);
	return menuPlacementOf(anchorInArea, menuHeight, { width: area.width, bottom });
}

/** One value to pick: its glyph, its name, and a check on the value the task holds. */
function MenuRow<T extends MenuOption>({
	option,
	onSelect
}: Readonly<{ option: T; onSelect: (option: T) => unknown }>) {
	const theme = useWebTheme();
	return (
		<Pressable
			testID="menu-option"
			accessibilityRole="button"
			accessibilityLabel={option.label}
			accessibilityState={{ selected: option.isSelected }}
			onPress={() => onSelect(option)}
			style={({ pressed }) => [styles.row, { backgroundColor: menuRowBackgroundOf(pressed, theme) }]}
		>
			<View style={styles.rowIcon}>{option.icon}</View>
			<Text numberOfLines={1} style={[styles.rowLabel, { color: theme.colors.foreground }]}>
				{option.label}
			</Text>
			{option.isSelected && <Check size={MENU_ICON_SIZE} color={theme.colors.primary} />}
		</Pressable>
	);
}

interface IPropertyMenuAction {
	icon: ReactNode;
	label: string;
	onPress: () => unknown;
	disabled?: boolean;
	/** Under a disabled action: why it is, and who can do it. */
	hint?: string;
}

/** An action at the foot of a menu, as a row with its icon in muted text: shown faded while it is out of reach. */
export function PropertyMenuAction({ icon, label, onPress, disabled = false, hint }: Readonly<IPropertyMenuAction>) {
	const theme = useWebTheme();
	const showsHint = disabled && Boolean(hint);
	return (
		<>
			<Pressable
				testID="menu-action"
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityState={{ disabled }}
				disabled={disabled}
				onPress={() => onPress()}
				style={({ pressed }) => [
					styles.row,
					disabled && styles.disabled,
					{ backgroundColor: menuRowBackgroundOf(pressed, theme) }
				]}
			>
				<View style={styles.rowIcon}>{icon}</View>
				<Text numberOfLines={1} style={[styles.rowLabel, { color: theme.colors.foreground }]}>
					{label}
				</Text>
			</Pressable>
			{showsHint && <Text style={[styles.hint, { color: theme.colors['muted-foreground'] }]}>{hint}</Text>}
		</>
	);
}

/**
 * A task's status, priority or size to pick, in the web's menu: under its chip on a raised surface, a search line on
 * top, then the values as rows of their glyph and name, the one the task holds checked. A tap outside, back, or
 * VoiceOver's escape closes it. It opens without the keyboard: the search line takes it on a tap.
 */
export function PropertyMenu<T extends MenuOption>({
	anchor,
	options,
	onSelect,
	onDismiss,
	searchPlaceholder,
	footer
}: Readonly<IPropertyMenu<T>>) {
	const theme = useWebTheme();
	const areaRef = useRef<View>(null);
	const [area, setArea] = useState<MenuArea | null>(null);
	const [query, setQuery] = useState('');
	const [listHeight, setListHeight] = useState<number | null>(null);
	const [footerHeight, setFooterHeight] = useState(0);
	const keyboardTop = useKeyboardTop();
	const shownOptions = options.filter((option) => matchesQuery(option.label, query));
	const isMeasured = area !== null && listHeight !== null;

	const measureArea = () => {
		areaRef.current?.measureInWindow((x, y, width, height) => setArea({ x, y, width, height }));
	};

	let placementStyle = {};
	if (area !== null && listHeight !== null) {
		placementStyle = placementInArea(area, { anchor, listHeight, footerHeight, keyboardTop });
	}

	return (
		<View ref={areaRef} collapsable={false} style={styles.area} onLayout={measureArea}>
			<Pressable
				testID="menu-backdrop"
				accessible={false}
				onAccessibilityEscape={() => onDismiss()}
				style={StyleSheet.absoluteFill}
				onPress={() => onDismiss()}
			/>
			<View
				testID="property-menu"
				style={[styles.menu, raisedSurfaceOf(theme), placementStyle, !isMeasured && styles.measuring]}
			>
				<View style={[styles.search, { borderColor: theme.colors.border }]}>
					<TextInput
						value={query}
						onChangeText={setQuery}
						placeholder={searchPlaceholder}
						placeholderTextColor={theme.colors['muted-foreground']}
						accessibilityLabel={searchPlaceholder}
						autoCapitalize="none"
						autoCorrect={false}
						style={[styles.searchInput, { color: theme.colors.foreground }]}
					/>
				</View>
				<ScrollView
					style={styles.list}
					contentContainerStyle={styles.listContent}
					keyboardShouldPersistTaps="handled"
					onContentSizeChange={(_, height) => setListHeight(height)}
				>
					{shownOptions.map((option) => (
						<MenuRow key={option.key} option={option} onSelect={onSelect} />
					))}
					{shownOptions.length === 0 && (
						<View style={styles.empty}>
							<Text style={[styles.rowLabel, { color: theme.colors['muted-foreground'] }]}>
								{emptyTextOf(options.length > 0)}
							</Text>
						</View>
					)}
				</ScrollView>
				{footer && (
					<View
						style={[styles.footer, { borderColor: theme.colors.border }]}
						onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
					>
						{footer}
					</View>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	area: {
		flex: 1
	},
	disabled: {
		opacity: 0.5
	},
	empty: {
		height: MENU_ROW_HEIGHT,
		justifyContent: 'center',
		paddingHorizontal: 8
	},
	footer: {
		borderTopWidth: StyleSheet.hairlineWidth,
		padding: MENU_LIST_PADDING
	},
	hint: {
		fontFamily: typography.primary.normal,
		fontSize: 12,
		paddingBottom: 4,
		paddingHorizontal: 8
	},
	list: {
		flexShrink: 1,
		maxHeight: MENU_LIST_MAX_HEIGHT
	},
	listContent: {
		padding: MENU_LIST_PADDING
	},
	// measured once on screen before it shows, so it never jumps into place
	measuring: {
		opacity: 0
	},
	menu: {
		overflow: 'hidden',
		position: 'absolute'
	},
	row: {
		alignItems: 'center',
		borderRadius: MENU_ROW_RADIUS,
		flexDirection: 'row',
		gap: 8,
		height: MENU_ROW_HEIGHT,
		paddingHorizontal: 8
	},
	rowIcon: {
		alignItems: 'center',
		height: MENU_ICON_SIZE,
		justifyContent: 'center',
		width: MENU_ICON_SIZE
	},
	rowLabel: {
		flex: 1,
		fontFamily: typography.primary.normal,
		fontSize: MENU_TEXT_SIZE
	},
	search: {
		alignItems: 'center',
		borderBottomWidth: StyleSheet.hairlineWidth,
		flexDirection: 'row',
		height: MENU_SEARCH_HEIGHT,
		paddingHorizontal: 12
	},
	searchInput: {
		flex: 1,
		fontFamily: typography.primary.normal,
		fontSize: MENU_TEXT_SIZE,
		padding: 0
	}
});
