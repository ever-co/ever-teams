'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import type { TimesheetSheetState } from '@/core/hooks/dashboards/timesheets/use-timesheet-sheet';
import type { TimesheetPermissions } from '@/core/hooks/dashboards/timesheets/use-timesheets-page';
import { cn } from '@/core/lib/helpers';
import type { SheetMember, TimesheetFormatters, WeekSheet } from '@/core/lib/utils/dashboards/timesheets';
import type { TimesheetRowHandlers } from './timesheet-log-row';
import { TimesheetStatusChip } from './timesheet-status';
import {
	memberNameOrFallback,
	TimesheetsMemberPicker,
	TimesheetsMemberRail,
	TimesheetsMemberRailSkeleton
} from './timesheets-member-rail';
import { TimesheetsSheetEntries } from './timesheets-sheet-entries';
import { type SheetPendingActions, type SheetSelectionActions, TimesheetsSheetFooter } from './timesheets-sheet-footer';
import { TimesheetsWeekSheet, TimesheetsWeekSheetSkeleton } from './timesheets-week-sheet';

const META_SEPARATOR = ' · ';

/** The rail and the sheet side by side from `lg`; the rail is as tall as the sheet and scrolls on its own. */
export const WITH_RAIL = 'lg:grid lg:min-h-96 lg:grid-cols-[15rem_minmax(0,1fr)]';

export const RAIL_CELL = 'relative max-lg:hidden';

export const SHEET_HEADER = 'flex min-h-12 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2';

function sheetCountsOf(sheet: WeekSheet, t: ReturnType<typeof useTranslations>) {
	const taskCount = t('dashboard.timesheets.SHEET.TASK_COUNT', { count: sheet.rows.length });
	const logCount = t('dashboard.timesheets.LOG_COUNT', { count: sheet.logCount });
	return [taskCount, logCount].join(META_SEPARATOR);
}

function SheetMemberHeader({
	member,
	members,
	sheet,
	showsPicker,
	onPick
}: Readonly<{
	member: SheetMember;
	members: ReadonlyArray<SheetMember>;
	sheet: WeekSheet;
	showsPicker: boolean;
	onPick: (memberId: string) => void;
}>) {
	const t = useTranslations();
	const name = memberNameOrFallback(member, t('dashboard.timesheets.SHEET.UNNAMED_MEMBER'));
	const counts = sheetCountsOf(sheet, t);
	return (
		<div className={SHEET_HEADER}>
			<div className="flex min-w-0 items-center">
				{showsPicker && (
					<span className="flex min-w-0 lg:hidden">
						<TimesheetsMemberPicker members={members} picked={member} onPick={onPick} />
					</span>
				)}
				<MemberCell name={name} imageUrl={member.imageUrl} className={cn(showsPicker && 'max-lg:hidden')} />
			</div>
			<div className="flex min-w-0 items-center gap-2">
				<span className="truncate text-xs tabular-nums text-muted-foreground">{counts}</span>
				<TimesheetStatusChip status={member.status} />
			</div>
		</div>
	);
}

/**
 * The Sheet view of the page: the member rail on the left from `lg` (a member menu above the sheet below it), the
 * picked member's week sheet, the closing strip with the approval actions, and the popover of a cell's entries.
 * With one member only, the rail is left out and the sheet takes the width. An empty period keeps the day columns
 * with one sentence under them.
 */
export function TimesheetsSheetView({
	state,
	formatters,
	permissions,
	handlers,
	selectedIdSet,
	onSelectLogs,
	selection,
	pending,
	isApproving,
	emptyContent
}: Readonly<{
	state: TimesheetSheetState;
	formatters: TimesheetFormatters;
	permissions: TimesheetPermissions;
	handlers: TimesheetRowHandlers;
	selectedIdSet: ReadonlySet<string>;
	onSelectLogs: (logIds: string[], shouldSelect: boolean) => void;
	selection: SheetSelectionActions;
	pending: Omit<SheetPendingActions, 'memberName'>;
	isApproving: boolean;
	emptyContent: ReactNode;
}>) {
	const t = useTranslations();
	const { members, member, days, sheet } = state;
	const showsRail = members.length > 1;
	const memberName = memberNameOf(member, t('dashboard.timesheets.SHEET.UNNAMED_MEMBER'));

	return (
		<div className={cn(showsRail && WITH_RAIL)}>
			{showsRail && (
				<div className={RAIL_CELL}>
					<div className="lg:absolute lg:inset-0">
						<TimesheetsMemberRail
							members={members}
							pickedId={member?.id ?? null}
							onPick={state.pickMember}
						/>
					</div>
				</div>
			)}
			<div className="flex min-w-0 flex-col">
				{member && (
					<SheetMemberHeader
						member={member}
						members={members}
						sheet={sheet}
						showsPicker={showsRail}
						onPick={state.pickMember}
					/>
				)}
				<TimesheetsWeekSheet
					days={days}
					sheet={sheet}
					memberName={memberName}
					formatters={formatters}
					selectedIdSet={selectedIdSet}
					openCell={state.openCell}
					isCellOpen={state.isCellOpen}
					onSelectLogs={onSelectLogs}
					onOpenCell={state.openCellEntries}
				/>
				{!member && emptyContent}
				{member && (
					<TimesheetsSheetFooter
						selection={selection}
						pending={{ ...pending, memberName }}
						canApprove={permissions.canApprove}
						isApproving={isApproving}
					/>
				)}
			</div>
			<TimesheetsSheetEntries
				sheet={sheet}
				days={days}
				openCell={state.openCell}
				isOpen={state.isCellOpen}
				onClose={state.closeCellEntries}
				formatters={formatters}
				permissions={permissions}
				handlers={handlers}
			/>
		</div>
	);
}

function memberNameOf(member: SheetMember | null, fallback: string) {
	if (!member) {
		return fallback;
	}
	return memberNameOrFallback(member, fallback);
}

/** The Sheet view while the first logs load: the rail, the member header and a week of task rows. */
export function TimesheetsSheetSkeleton() {
	return (
		<div aria-hidden="true" className={WITH_RAIL}>
			<div className={RAIL_CELL}>
				<div className="lg:absolute lg:inset-0">
					<TimesheetsMemberRailSkeleton />
				</div>
			</div>
			<div className="flex min-w-0 flex-col">
				<div className={SHEET_HEADER}>
					<span className="flex items-center gap-2.5">
						<span className="size-6 shrink-0 rounded-full bg-foreground/[0.06]" />
						<span className={cn('h-2.5 w-28', SKELETON_BAR)} />
					</span>
					<span className="flex items-center gap-2">
						<span className={cn('h-2 w-20', SKELETON_BAR)} />
						<span className="h-6 w-20 rounded-md bg-foreground/[0.05]" />
					</span>
				</div>
				<TimesheetsWeekSheetSkeleton />
			</div>
		</div>
	);
}
