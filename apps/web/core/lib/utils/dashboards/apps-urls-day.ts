import type { AppUsageRow, UsagePerson } from './apps-urls';

/** The members with app or site time in the period, most time first: the ones a day of theirs can show. */
export function dayMembersOf(rows: ReadonlyArray<AppUsageRow>): UsagePerson[] {
	const byId = new Map<string, { person: UsagePerson; seconds: number }>();
	for (const row of rows) {
		const existing = byId.get(row.employee.id);
		if (existing) {
			existing.seconds += row.seconds;
			continue;
		}
		byId.set(row.employee.id, { person: row.employee, seconds: row.seconds });
	}
	const ranked = [...byId.values()];
	ranked.sort((first, second) => second.seconds - first.seconds);
	return ranked.map((entry) => entry.person);
}

/**
 * The member who leads the report: the one held, while they still have time in it, else whoever spent the most time
 * in apps and sites. A live report is read again every minute, and the ranking moving must not move the panel.
 */
export function leadingDayMemberIdOf(members: ReadonlyArray<UsagePerson>, heldId: string | null) {
	const isHeldKnown = heldId !== null && members.some((member) => member.id === heldId);
	if (isHeldKnown) {
		return heldId;
	}
	return members[0]?.id ?? null;
}

/** The picked member when there is one, then the viewer, then the member leading the report. */
export function defaultDayMemberIdOf(
	members: ReadonlyArray<UsagePerson>,
	selectedIds: ReadonlyArray<string>,
	ownEmployeeId: string | null,
	leadingId: string | null = members[0]?.id ?? null
) {
	const ids = new Set(members.map((member) => member.id));
	const firstSelected = selectedIds.find((id) => ids.has(id));
	if (firstSelected) {
		return firstSelected;
	}
	const hasOwn = Boolean(ownEmployeeId) && ids.has(ownEmployeeId ?? '');
	if (hasOwn) {
		return ownEmployeeId;
	}
	return leadingId;
}

/** The days the member has app or site time on in the period, oldest first, by the report's day keys. */
export function activeDayKeysOf(rows: ReadonlyArray<AppUsageRow>, employeeId: string | null): string[] {
	if (!employeeId) {
		return [];
	}
	const keys = new Set<string>();
	for (const row of rows) {
		const isMember = row.employee.id === employeeId;
		const hasTime = row.seconds > 0;
		const counts = isMember && hasTime;
		if (counts) {
			keys.add(row.dateKey.slice(0, 10));
		}
	}
	return [...keys].sort((first, second) => first.localeCompare(second));
}

/** A report day key ("2026-11-03") as that day's local midnight. */
export function dayOfKey(dayKey: string) {
	return new Date(`${dayKey}T00:00:00`);
}
