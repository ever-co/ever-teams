'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { Button } from '@/core/components/duplicated-components/_button';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { ChevronDown } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { SheetMember } from '@/core/lib/utils/dashboards/timesheets';
import type { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { STATUS_LABEL_KEYS, TimesheetStatusDot, TimesheetStatusGlyph } from './timesheet-status';

/** The rail's header has the height of the sheet's member header, so the two headers line up. */
export const RAIL_HEADER = 'flex h-12 shrink-0 items-center justify-between gap-2 px-3';

/** Long teams: members far below the fold skip layout and paint until they come near. */
const DEFERRED_RAIL_ROW = '[content-visibility:auto] [contain-intrinsic-size:auto_2.75rem]';

const SKELETON_MEMBERS = [0, 1, 2, 3, 4];

export function memberNameOrFallback(member: SheetMember, fallback: string) {
	if (member.name) {
		return member.name;
	}
	return fallback;
}

function MemberStatusMark({ status }: Readonly<{ status: ETimesheetStatus | null }>) {
	const t = useTranslations();
	if (!status) {
		return null;
	}
	return (
		<span className="inline-flex shrink-0">
			<TimesheetStatusGlyph status={status} className="size-4" />
			<span className="sr-only">{t(STATUS_LABEL_KEYS[status])}</span>
		</span>
	);
}

const RailMember = memo(function RailMember({
	member,
	isPicked,
	onPick
}: Readonly<{ member: SheetMember; isPicked: boolean; onPick: (memberId: string) => void }>) {
	const t = useTranslations();
	const name = memberNameOrFallback(member, t('dashboard.timesheets.SHEET.UNNAMED_MEMBER'));
	const total = formatDurationShort(member.totalSeconds);
	return (
		<li className={DEFERRED_RAIL_ROW}>
			<button
				type="button"
				aria-pressed={isPicked}
				onClick={() => onPick(member.id)}
				className={cn(
					'flex h-11 w-full items-center gap-2 rounded-md px-2 text-left outline-none transition-colors hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/25',
					isPicked && 'bg-foreground/[0.03]'
				)}
			>
				<MemberCell name={name} imageUrl={member.imageUrl} meta={total} className="flex-1" />
				<MemberStatusMark status={member.status} />
			</button>
		</li>
	);
});

/**
 * The members with time in the period, on the left of the sheet from `lg`: avatar, name, their total and the glyph
 * of the status that needs someone first (dashed draft, half pending, full approved, cross rejected). Picking one
 * opens their sheet.
 */
export const TimesheetsMemberRail = memo(function TimesheetsMemberRail({
	members,
	pickedId,
	onPick
}: Readonly<{ members: ReadonlyArray<SheetMember>; pickedId: string | null; onPick: (memberId: string) => void }>) {
	const t = useTranslations();
	return (
		<nav aria-label={t('dashboard.timesheets.SHEET.MEMBERS_LABEL')} className="flex h-full min-h-0 flex-col">
			<div className={RAIL_HEADER}>
				<span className="text-xs font-medium tabular-nums text-muted-foreground">
					{t('dashboard.timesheets.MEMBER_COUNT', { count: members.length })}
				</span>
			</div>
			<ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-1.5">
				{members.map((member) => (
					<RailMember key={member.id} member={member} isPicked={member.id === pickedId} onPick={onPick} />
				))}
			</ul>
		</nav>
	);
});

/** Below `lg` the rail becomes a member menu above the sheet: the same people, totals and status, one tap away. */
export function TimesheetsMemberPicker({
	members,
	picked,
	onPick
}: Readonly<{ members: ReadonlyArray<SheetMember>; picked: SheetMember; onPick: (memberId: string) => void }>) {
	const t = useTranslations();
	const fallbackName = t('dashboard.timesheets.SHEET.UNNAMED_MEMBER');
	const pickedName = memberNameOrFallback(picked, fallbackName);
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="default"
					aria-label={t('dashboard.timesheets.SHEET.PICK_MEMBER', { name: pickedName })}
					className="min-w-0 max-w-full shrink gap-2 pl-1.5"
				>
					<MemberCell name={pickedName} imageUrl={picked.imageUrl} className="gap-2" />
					<ChevronDown className="text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="max-h-80 min-w-64 overflow-y-auto">
				{members.map((member) => {
					const name = memberNameOrFallback(member, fallbackName);
					const total = formatDurationShort(member.totalSeconds);
					const isPicked = member.id === picked.id;
					return (
						<DropdownMenuItem key={member.id} onClick={() => onPick(member.id)}>
							{member.status && <TimesheetStatusDot status={member.status} />}
							<span className="min-w-0 flex-1 truncate">{name}</span>
							<span className="shrink-0 text-xs tabular-nums text-muted-foreground">{total}</span>
							{isPicked && <SelectedMark />}
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** The rail while the first logs load: its header and member rows at their real height. */
export function TimesheetsMemberRailSkeleton() {
	return (
		<div aria-hidden="true" className="flex h-full flex-col">
			<div className={RAIL_HEADER}>
				<span className={cn('h-2.5 w-16', SKELETON_BAR)} />
			</div>
			<div className="flex flex-col gap-0.5 p-1.5">
				{SKELETON_MEMBERS.map((index) => (
					<div key={index} className="flex h-11 items-center gap-2.5 px-2">
						<span className="size-6 shrink-0 rounded-full bg-foreground/[0.06]" />
						<span className="flex flex-1 flex-col gap-1.5">
							<span className={cn('h-2.5 w-24', SKELETON_BAR)} />
							<span className={cn('h-2 w-12', SKELETON_BAR)} />
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
