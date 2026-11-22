import React, { useState, type RefObject } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import moment from 'moment-timezone';
import { Calendar as CalendarView } from 'react-native-calendars';
import { showMessage } from 'react-native-flash-message';
import { Calendar, X } from '../../../../../src/components/icons';
import { useMenuAnchor } from '../../../../../src/components/menu-anchor';
import type { MenuRect } from '../../../../../src/components/menu-placement';
import {
	MENU_ICON_SIZE,
	MENU_LIST_PADDING,
	MENU_ROW_HEIGHT,
	MENU_ROW_RADIUS,
	MENU_TEXT_SIZE,
	menuRowBackgroundOf,
	raisedSurfaceOf
} from '../../../../../src/theme/menu-look';
import type { Theme } from '../../../../../src/theme/use-theme';
import { translate } from '../../../../i18n';
import { useAppLocale } from '../../../../i18n/use-app-locale';
import { typography, useWebTheme } from '../../../../theme';
import { MenuSeparator } from '../../../actions-menu';
import { EmptyValueButton } from '../../../empty-value-button';
import { MenuLayer, placementOnArea, useMenuArea } from '../../../property-menu';
import {
	acceptsDayFor,
	calendarDayOf,
	DATE_PRESETS,
	dayOfStoredDate,
	presetDayOf,
	shortDayOf,
	storedDateOf
} from './task-date-rules';
import type { DatePreset, TaskDateKind } from './task-date-rules';

/** The web's date popover holds the quick picks and the calendar, its start on the field's. */
const DATE_MENU_WIDTH = 288;
const DATE_MENU_OFFSET = 4;
const GLYPH_SIZE = 14;
const VALUE_HEIGHT = 28;

const PRESET_KEYS = {
	today: 'taskMenus.dates.today',
	tomorrow: 'taskMenus.dates.tomorrow',
	endOfWeek: 'taskMenus.dates.endOfWeek',
	inOneWeek: 'taskMenus.dates.inOneWeek'
} as const satisfies Record<DatePreset, string>;

const REFUSAL_KEYS = {
	start: 'taskMenus.dates.startAfterDue',
	due: 'taskMenus.dates.dueBeforeStart'
} as const;

const FIELD_KEYS = {
	start: 'taskDetailsScreen.startDate',
	due: 'taskDetailsScreen.dueDate'
} as const;

/** The calendar in the app's colors, from the theme in both modes. */
function calendarThemeOf(theme: Theme) {
	return {
		arrowColor: theme.colors['muted-foreground'],
		calendarBackground: 'transparent',
		dayTextColor: theme.colors.foreground,
		monthTextColor: theme.colors.foreground,
		selectedDayBackgroundColor: theme.colors.primary,
		selectedDayTextColor: theme.colors['primary-foreground'],
		textDayFontSize: 13,
		textDayHeaderFontSize: 11,
		textDisabledColor: theme.colors['muted-foreground'],
		textMonthFontSize: 13,
		textSectionTitleColor: theme.colors['muted-foreground'],
		todayTextColor: theme.colors.primary,
		// the web's calendar rows are about 32 high; the library's 7 above and under each week made them 46
		weekVerticalMargin: 1
	};
}

function markedDatesOf(day: Date | null) {
	if (!day) {
		return {};
	}
	return { [calendarDayOf(day)]: { selected: true } };
}

interface IPresetRow {
	label: string;
	day: string;
	onPress: () => unknown;
}

/** A quick pick: its name, and the day it names in muted text. */
function PresetRow({ label, day, onPress }: Readonly<IPresetRow>) {
	const theme = useWebTheme();
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`${label}, ${day}`}
			onPress={() => onPress()}
			style={({ pressed }) => [styles.row, { backgroundColor: menuRowBackgroundOf(pressed, theme) }]}
		>
			<Text numberOfLines={1} style={[styles.rowLabel, { color: theme.colors.foreground }]}>
				{label}
			</Text>
			<Text style={[styles.rowHint, { color: theme.colors['muted-foreground'] }]}>{day}</Text>
		</Pressable>
	);
}

interface IDateMenu {
	anchor: MenuRect;
	day: Date | null;
	locale: string;
	onPick: (day: Date) => unknown;
	onClear: () => unknown;
	onDismiss: () => unknown;
}

/** The web's date popover: the quick picks, the calendar, and Clear date once a date is set. */
function DateMenu({ anchor, day, locale, onPick, onClear, onDismiss }: Readonly<IDateMenu>) {
	const theme = useWebTheme();
	const { areaRef, area, measureArea, context } = useMenuArea();
	const [menuHeight, setMenuHeight] = useState<number | null>(null);
	const isMeasured = area !== null && menuHeight !== null;
	const hasDay = day !== null;
	const muted = theme.colors['muted-foreground'];
	const clearLabel = translate('taskMenus.dates.clear');

	let placementStyle = {};
	if (area !== null && menuHeight !== null) {
		const shape = { width: DATE_MENU_WIDTH, align: 'start' as const, offset: DATE_MENU_OFFSET };
		placementStyle = placementOnArea(area, anchor, menuHeight, context, shape);
	}

	return (
		<MenuLayer areaRef={areaRef} measureArea={measureArea} onDismiss={onDismiss}>
			<View
				testID="date-menu"
				style={[
					styles.menu,
					raisedSurfaceOf(theme),
					{ width: DATE_MENU_WIDTH },
					placementStyle,
					!isMeasured && styles.measuring
				]}
			>
				{/* with less room than it needs (under a field low on the screen) the menu scrolls, Clear date last */}
				<ScrollView
					contentContainerStyle={styles.menuContent}
					keyboardShouldPersistTaps="handled"
					onContentSizeChange={(_, height) => setMenuHeight(height)}
				>
					{DATE_PRESETS.map((preset) => {
						const presetDay = presetDayOf(preset);
						return (
							<PresetRow
								key={preset}
								label={translate(PRESET_KEYS[preset])}
								day={shortDayOf(presetDay, locale)}
								onPress={() => onPick(presetDay)}
							/>
						);
					})}
					<MenuSeparator />
					<CalendarView
						current={calendarDayOf(day ?? new Date())}
						markedDates={markedDatesOf(day)}
						onDayPress={(picked) => onPick(moment(picked.dateString).toDate())}
						theme={calendarThemeOf(theme)}
						enableSwipeMonths
					/>
					{hasDay && (
						<>
							<MenuSeparator />
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={clearLabel}
								onPress={() => onClear()}
								style={({ pressed }) => [
									styles.row,
									{ backgroundColor: menuRowBackgroundOf(pressed, theme) }
								]}
							>
								<X size={MENU_ICON_SIZE} color={muted} />
								<Text numberOfLines={1} style={[styles.rowLabel, { color: muted }]}>
									{clearLabel}
								</Text>
							</Pressable>
						</>
					)}
				</ScrollView>
			</View>
		</MenuLayer>
	);
}

interface IDateTrigger {
	kind: TaskDateKind;
	day: Date | null;
	locale: string;
	anchorRef: RefObject<View | null>;
	disabled: boolean;
	onPress: () => unknown;
}

/** The field as the web's task page reads it: "+ Add date" while empty, else the calendar glyph and the short day. */
function DateTrigger({ kind, day, locale, anchorRef, disabled, onPress }: Readonly<IDateTrigger>) {
	const theme = useWebTheme();
	const fieldName = translate(FIELD_KEYS[kind]);
	if (!day) {
		return (
			<EmptyValueButton
				anchorRef={anchorRef}
				testID={`task-date-${kind}`}
				label={translate('taskMenus.dates.addDate')}
				accessibilityLabel={fieldName}
				disabled={disabled}
				onPress={onPress}
			/>
		);
	}
	const shownDay = shortDayOf(day, locale);
	return (
		<Pressable
			ref={anchorRef}
			testID={`task-date-${kind}`}
			accessibilityRole="button"
			accessibilityLabel={`${fieldName}, ${shownDay}`}
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={() => onPress()}
			style={styles.value}
		>
			<Calendar size={GLYPH_SIZE} color={theme.colors['muted-foreground']} />
			<Text style={[styles.valueText, { color: theme.colors.foreground }]}>{shownDay}</Text>
		</Pressable>
	);
}

interface ITaskDateField {
	kind: TaskDateKind;
	/** The task's date of this kind, as stored. */
	value?: string | null;
	/** The task's other date, which a picked day may not cross. */
	otherDate?: string | null;
	/** Saves the picked day as the task page sends a date, or null to clear it. */
	onChange: (stored: string | null) => unknown;
	/** True while a save of the task's dates is pending: the field does not open meanwhile. */
	disabled?: boolean;
}

/**
 * A task's start or due date on the task page, as the web's date field: "+ Add date" while empty, the short day once
 * set, and a popover under it with the quick picks, the calendar and Clear date. A start after the due day, or a due
 * day before the start, is refused with the reason.
 */
export function TaskDateField({ kind, value, otherDate, onChange, disabled = false }: Readonly<ITaskDateField>) {
	const locale = useAppLocale();
	const [isOpen, setOpen] = useState(false);
	const { anchorRef, anchor, openFromAnchor } = useMenuAnchor();
	const day = dayOfStoredDate(value);
	const showsMenu = isOpen && anchor !== null;
	const close = () => setOpen(false);

	// The menu closes first: the reason of a refusal shows over the screen, never under the menu
	const pick = (picked: Date) => {
		close();
		const isAccepted = acceptsDayFor(kind, picked, otherDate);
		if (!isAccepted) {
			showMessage({ message: translate(REFUSAL_KEYS[kind]), type: 'warning' });
			return;
		}
		onChange(storedDateOf(picked));
	};

	const clear = () => {
		close();
		onChange(null);
	};

	return (
		<>
			<DateTrigger
				kind={kind}
				day={day}
				locale={locale}
				anchorRef={anchorRef}
				disabled={disabled}
				onPress={() => openFromAnchor(() => setOpen(true))}
			/>
			<Modal animationType="fade" transparent visible={showsMenu} onRequestClose={close}>
				{anchor && (
					<DateMenu
						anchor={anchor}
						day={day}
						locale={locale}
						onPick={pick}
						onClear={clear}
						onDismiss={close}
					/>
				)}
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
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
		minHeight: MENU_ROW_HEIGHT,
		paddingHorizontal: 8
	},
	rowHint: {
		fontSize: 12,
		fontVariant: ['tabular-nums']
	},
	rowLabel: {
		flex: 1,
		fontFamily: typography.primary.normal,
		fontSize: MENU_TEXT_SIZE
	},
	// a larger system font grows the field instead of clipping its day
	value: {
		alignItems: 'center',
		alignSelf: 'flex-start',
		borderRadius: 6,
		flexDirection: 'row',
		gap: 6,
		marginLeft: -6,
		minHeight: VALUE_HEIGHT,
		paddingHorizontal: 6
	},
	valueText: {
		fontFamily: typography.primary.medium,
		fontSize: 13,
		fontVariant: ['tabular-nums']
	}
});
