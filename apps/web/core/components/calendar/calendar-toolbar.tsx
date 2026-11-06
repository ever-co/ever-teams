'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MENU_ROW, MENU_SURFACE } from '@/core/components/common/menu-recipes';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { MemberCell } from '@/core/components/dashboards/kit/member-cell';
import { ChevronLeft, ChevronRight, ChevronsUpDown } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { CalendarMember, CalendarView } from '@/core/lib/utils/calendar-view';
import { ENTRY_HATCHED, ENTRY_SOLID, PLANNED_OUTLINE } from './calendar-recipes';

const GROUP =
	'inline-flex h-8 min-w-0 shrink-0 items-center rounded-full bg-card p-0.5 hairline-ring ring-foreground/10 shadow-[0_1px_2px_rgb(0_0_0/0.06)] dark:bg-foreground/5';

const STEP_BUTTON =
	'inline-flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-4';

const TODAY_BUTTON =
	'inline-flex h-7 items-center rounded-full px-2.5 text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-[3px] focus-visible:ring-ring/25';

const MEMBER_TRIGGER =
	'inline-flex h-8 min-w-0 max-w-64 items-center gap-2 rounded-full bg-card pr-2 pl-1 text-[13px] text-foreground outline-none hairline-ring ring-foreground/10 shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[state=open]:bg-muted/50 dark:bg-foreground/5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground';

/** "< Today >" around the name of what is shown: "November 2026", "Nov 3 – 9", "Mon, Nov 3". */
export function CalendarRangeStepper({
	view,
	rangeName,
	onPrevious,
	onToday,
	onNext
}: Readonly<{
	view: CalendarView;
	rangeName: string;
	onPrevious: () => void;
	onToday: () => void;
	onNext: () => void;
}>) {
	const t = useTranslations();
	return (
		<div className="flex min-w-0 items-center gap-2.5">
			<fieldset className={GROUP} aria-label={t('dashboard.calendar.RANGE_LABEL')}>
				<button
					type="button"
					className={STEP_BUTTON}
					aria-label={t('dashboard.calendar.PREVIOUS', { view })}
					onClick={onPrevious}
				>
					<ChevronLeft />
				</button>
				<button type="button" className={TODAY_BUTTON} onClick={onToday}>
					{t('common.TODAY')}
				</button>
				<button
					type="button"
					className={STEP_BUTTON}
					aria-label={t('dashboard.calendar.NEXT', { view })}
					onClick={onNext}
				>
					<ChevronRight />
				</button>
			</fieldset>
			<h2 aria-live="polite" className="truncate text-[13px] font-medium tabular-nums text-foreground">
				{rangeName}
			</h2>
		</div>
	);
}

/** Whose calendar it is, for a manager: the active team's members, the shown one marked. */
export function CalendarMemberSwitch({
	members,
	shownMember,
	ownEmployeeId,
	onPick
}: Readonly<{
	members: ReadonlyArray<CalendarMember>;
	shownMember: CalendarMember | null;
	ownEmployeeId: string | null;
	onPick: (employeeId: string) => void;
}>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	const shownName = shownMember?.name ?? '';
	const pick = (employeeId: string) => {
		onPick(employeeId);
		setIsOpen(false);
	};
	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-label={t('dashboard.calendar.MEMBER_SWITCH_LABEL', { name: shownName })}
					className={MEMBER_TRIGGER}
				>
					<MemberCell name={shownName} imageUrl={shownMember?.imageUrl} className="min-w-0" />
					<ChevronsUpDown aria-hidden="true" />
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" sideOffset={6} className={cn(MENU_SURFACE, 'w-64 p-1')}>
				<div
					role="listbox"
					aria-label={t('common.MEMBERS')}
					className="flex max-h-80 flex-col gap-px overflow-y-auto"
				>
					{members.map((member) => {
						const isShown = member.employeeId === shownMember?.employeeId;
						const isOwn = member.employeeId === ownEmployeeId;
						return (
							<button
								key={member.employeeId}
								type="button"
								role="option"
								aria-selected={isShown}
								onClick={() => pick(member.employeeId)}
								className={cn(MENU_ROW, 'h-9', isShown && 'bg-foreground/5')}
							>
								<MemberCell name={member.name} imageUrl={member.imageUrl} className="min-w-0 flex-1" />
								{isOwn && (
									<span className="shrink-0 text-xs text-muted-foreground">
										{t('dashboard.calendar.YOU')}
									</span>
								)}
								{isShown && <SelectedMark />}
							</button>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);
}

export function CalendarViewSwitch({
	view,
	onChange
}: Readonly<{ view: CalendarView; onChange: (view: CalendarView) => void }>) {
	const t = useTranslations();
	const items = [
		{ value: 'month' as const, label: t('dashboard.calendar.VIEWS.MONTH') },
		{ value: 'week' as const, label: t('dashboard.calendar.VIEWS.WEEK') },
		{ value: 'day' as const, label: t('dashboard.calendar.VIEWS.DAY') }
	];
	return (
		<SegmentedControl<CalendarView>
			items={items}
			value={view}
			onValueChange={onChange}
			ariaLabel={t('dashboard.calendar.VIEW_LABEL')}
		/>
	);
}

function LegendSwatch({ className }: Readonly<{ className: string }>) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'relative block h-3 w-4 shrink-0 overflow-hidden rounded-[3px] [--entry:hsl(var(--primary))]',
				className
			)}
		/>
	);
}

/** What the three fills mean: tracked time solid, time added by hand hatched, planned work outlined. */
export function CalendarLegend({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	return (
		<ul
			aria-label={t('dashboard.calendar.LEGEND_LABEL')}
			className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground', className)}
		>
			<li className="flex items-center gap-1.5">
				<LegendSwatch className={ENTRY_SOLID} />
				{t('dashboard.calendar.LEGEND.TRACKED')}
			</li>
			<li className="flex items-center gap-1.5">
				<LegendSwatch className={ENTRY_HATCHED} />
				{t('dashboard.calendar.LEGEND.MANUAL')}
			</li>
			<li className="flex items-center gap-1.5">
				<LegendSwatch className={PLANNED_OUTLINE} />
				{t('dashboard.calendar.LEGEND.PLANNED')}
			</li>
		</ul>
	);
}
