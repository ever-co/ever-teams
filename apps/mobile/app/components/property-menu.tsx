import React, { ReactNode, RefObject, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { SelectedMark } from '../../src/components/selected-mark';
import { menuPlacementOf, MenuRect, MenuShape } from '../../src/components/menu-placement';
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
import type { Theme } from '../../src/theme/use-theme';

/** One row and the list's padding: the least of the values the menu keeps in sight. */
const MENU_LIST_MIN_HEIGHT = MENU_ROW_HEIGHT + 2 * MENU_LIST_PADDING;

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
	/** Names shown capitalized, as the web's status menu and the chips show them. */
	capitalizesLabels?: boolean;
}

/** The screen the menu lives on, in window coordinates. */
export type MenuArea = MenuRect;

/** The room the status bar and the navigation bar take on the screen. */
export interface SystemBars {
	top: number;
	bottom: number;
}

const NO_SYSTEM_BARS: SystemBars = { top: 0, bottom: 0 };

/** The system bars' room, none where the app gives no safe area, as in a test. */
function useSystemBars(): SystemBars {
	return useContext(SafeAreaInsetsContext) ?? NO_SYSTEM_BARS;
}

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

/**
 * The part of its area the menu may take: under the status bar, above the navigation bar and the keyboard. The
 * phone's bars are left out only where the area reaches under them.
 */
function areaLimitsOf(area: MenuArea, bars: SystemBars, screenHeight: number, keyboardTop: number | null) {
	const top = Math.max(0, bars.top - area.y);
	const areaBottom = area.y + area.height;
	const bottomGap = screenHeight - areaBottom;
	const bottomBar = Math.max(0, bars.bottom - bottomGap);
	const aboveBar = area.height - bottomBar;
	if (keyboardTop === null) {
		return { top, bottom: aboveBar };
	}
	return { top, bottom: Math.min(aboveBar, keyboardTop - area.y) };
}

export interface AreaContext {
	keyboardTop: number | null;
	bars: SystemBars;
	screenHeight: number;
}

/** A menu's place on its area under its trigger, for the height it takes and the shape it asks. */
export function placementOnArea(
	area: MenuArea,
	anchor: MenuRect,
	menuHeight: number,
	context: AreaContext,
	shape?: MenuShape
) {
	const anchorInArea = { ...anchor, x: anchor.x - area.x, y: anchor.y - area.y };
	return menuPlacementOf(anchorInArea, menuHeight, menuLimitsOn(area, context), shape);
}

/** The part of its area a menu may take, in the area's own coordinates, as a submenu is placed in it too. */
export function menuLimitsOn(area: MenuArea, context: AreaContext) {
	const limits = areaLimitsOf(area, context.bars, context.screenHeight, context.keyboardTop);
	return { width: area.width, ...limits };
}

/** The screen a menu lives on, measured once laid out, with what limits it there: the system bars and the keyboard. */
export function useMenuArea() {
	const areaRef = useRef<View>(null);
	const [area, setArea] = useState<MenuArea | null>(null);
	const keyboardTop = useKeyboardTop();
	const bars = useSystemBars();
	const measureArea = useCallback(() => {
		areaRef.current?.measureInWindow((x, y, width, height) => setArea({ x, y, width, height }));
	}, []);
	const context: AreaContext = { keyboardTop, bars, screenHeight: Dimensions.get('screen').height };
	return { areaRef, area, measureArea, context };
}

interface IMenuLayer {
	areaRef: RefObject<View | null>;
	measureArea: () => unknown;
	onDismiss: () => unknown;
	testID?: string;
	children: ReactNode;
}

/**
 * The screen under a menu, measured to place the menu on it: a tap outside the menu closes it, and so does VoiceOver's
 * escape, which goes up from the row it is on: the layer holds the menu's rows, the backdrop none.
 */
export function MenuLayer({ areaRef, measureArea, onDismiss, testID, children }: Readonly<IMenuLayer>) {
	return (
		<View
			testID={testID}
			ref={areaRef}
			collapsable={false}
			style={styles.area}
			onLayout={() => measureArea()}
			onAccessibilityEscape={() => onDismiss()}
		>
			<Pressable
				testID="menu-backdrop"
				accessible={false}
				style={StyleSheet.absoluteFill}
				onPress={() => onDismiss()}
			/>
			{children}
		</View>
	);
}

export interface MenuMeasures {
	anchor: MenuRect;
	listHeight: number;
	footerHeight: number;
	keyboardTop: number | null;
	bars: SystemBars;
	screenHeight: number;
}

/** The menu's place on its area, from its chip and the height its search line, list and footer take. */
export function placementInArea(area: MenuArea, measures: MenuMeasures) {
	const { anchor, listHeight, footerHeight, keyboardTop, bars, screenHeight } = measures;
	const shownListHeight = Math.min(listHeight, MENU_LIST_MAX_HEIGHT);
	const menuHeight = MENU_SEARCH_HEIGHT + shownListHeight + footerHeight;
	return placementOnArea(area, anchor, menuHeight, { keyboardTop, bars, screenHeight });
}

/** One value to pick: its glyph, its name, and a check on the value the task holds. */
interface IMenuRow<T extends MenuOption> {
	option: T;
	onSelect: (option: T) => unknown;
	capitalizesLabel: boolean;
}

function MenuRow<T extends MenuOption>({ option, onSelect, capitalizesLabel }: Readonly<IMenuRow<T>>) {
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
			<Text
				numberOfLines={1}
				style={[styles.rowLabel, capitalizesLabel && styles.capitalized, { color: theme.colors.foreground }]}
			>
				{option.label}
			</Text>
			{option.isSelected && <SelectedMark />}
		</Pressable>
	);
}

export type MenuActionTone = 'default' | 'destructive';

/** An action's ink: Delete reads in destructive-ink, as in the web's menus. */
export function menuActionInkOf(tone: MenuActionTone, theme: Theme): string {
	if (tone === 'destructive') {
		return theme.colors['destructive-ink'];
	}
	return theme.colors.foreground;
}

interface IPropertyMenuAction {
	icon: ReactNode;
	label: string;
	onPress: () => unknown;
	disabled?: boolean;
	tone?: MenuActionTone;
	/** Under a disabled action: why it is, and who can do it. */
	hint?: string;
}

/** An action at the foot of a menu, as a row with its icon in muted text: shown faded while it is out of reach. */
export function PropertyMenuAction({
	icon,
	label,
	onPress,
	disabled = false,
	tone = 'default',
	hint
}: Readonly<IPropertyMenuAction>) {
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
				<Text numberOfLines={1} style={[styles.rowLabel, { color: menuActionInkOf(tone, theme) }]}>
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
	footer,
	capitalizesLabels = false
}: Readonly<IPropertyMenu<T>>) {
	const theme = useWebTheme();
	const { areaRef, area, measureArea, context } = useMenuArea();
	const [query, setQuery] = useState('');
	const [listHeight, setListHeight] = useState<number | null>(null);
	const [footerHeight, setFooterHeight] = useState(0);
	const shownOptions = options.filter((option) => matchesQuery(option.label, query));
	const isMeasured = area !== null && listHeight !== null;

	let placementStyle = {};
	if (area !== null && listHeight !== null) {
		placementStyle = placementInArea(area, { anchor, listHeight, footerHeight, ...context });
	}

	return (
		<MenuLayer testID="menu-area" areaRef={areaRef} measureArea={measureArea} onDismiss={onDismiss}>
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
					testID="menu-list"
					style={styles.list}
					contentContainerStyle={styles.listContent}
					keyboardShouldPersistTaps="handled"
					onContentSizeChange={(_, height) => setListHeight(height)}
				>
					{shownOptions.map((option) => (
						<MenuRow
							key={option.key}
							option={option}
							onSelect={onSelect}
							capitalizesLabel={capitalizesLabels}
						/>
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
		</MenuLayer>
	);
}

const styles = StyleSheet.create({
	area: {
		flex: 1
	},
	capitalized: {
		textTransform: 'capitalize'
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
	// with the keyboard up and a long read-only hint under it, the menu still shows a row of values to scroll; the
	// hint is what the menu's edge cuts
	list: {
		flexShrink: 1,
		maxHeight: MENU_LIST_MAX_HEIGHT,
		minHeight: MENU_LIST_MIN_HEIGHT
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
