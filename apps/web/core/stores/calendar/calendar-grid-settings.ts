import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import {
	type CalendarGridSettings,
	calendarGridSettingsOf,
	DEFAULT_CALENDAR_GRID_SETTINGS
} from '@/core/lib/utils/calendar-grid-settings';

/** What the browser holds, as it holds it: read through `calendarGridSettingsState`, which checks every value. */
const storedCalendarGridSettingsState = atomWithStorage<unknown>(
	'calendar-grid-settings',
	DEFAULT_CALENDAR_GRID_SETTINGS,
	undefined,
	// The grids render once the team is read, on the client only: reading at once spares a redraw at the old height
	{ getOnInit: true }
);

/** The snap step, visible hours and row height of the Calendar's week and day grids, kept in this browser. */
export const calendarGridSettingsState = atom(
	(get) => calendarGridSettingsOf(get(storedCalendarGridSettingsState)),
	(_get, set, next: CalendarGridSettings) => {
		set(storedCalendarGridSettingsState, next);
	}
);
