import { FC } from 'react';
import { cn } from '@/core/lib/helpers';
import { TimesheetViewSkeleton } from './timesheet-skeletons';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const CALENDAR_DAY_HEADERS = 7;

const CALENDAR_DAY_CELLS = 42;

const MODAL_FIELDS = 3;

interface SkeletonProps {
	className?: string;
}

/** The month calendar: its toolbar, then a hairline grid of six weeks inside one surface. */
export const SetupFullCalendarSkeleton: FC<SkeletonProps> = ({ className }) => {
	const headerKeys = Array.from({ length: CALENDAR_DAY_HEADERS }, (_, index) => index);
	const cellKeys = Array.from({ length: CALENDAR_DAY_CELLS }, (_, index) => index);
	return (
		<div className={cn('-mx-2 flex flex-col overflow-hidden px-2 py-8', className)}>
			<div className="w-full rounded-xl bg-card p-4 hairline-ring ring-border shadow-sm shadow-black/6.5">
				<div className="flex w-full items-center justify-between p-2">
					<div className="flex items-center gap-3">
						<div className={cn(BAR, 'h-9.5 w-50')} />
						<div className={cn(BAR, 'h-9.5 w-50')} />
					</div>
					<div className={cn(BAR, 'h-9.5 w-22')} />
				</div>
				<div className="mt-5 overflow-hidden rounded-lg hairline-border border-border">
					<div className="grid grid-cols-7 hairline-divide-x divide-border hairline-b border-border">
						{headerKeys.map((key) => (
							<div key={key} className="flex h-6 items-center justify-center">
								<div className={cn(BAR, 'h-2.5 w-8')} />
							</div>
						))}
					</div>
					<div className="grid grid-cols-7">
						{cellKeys.map((key) => (
							<div
								key={key}
								className="flex h-19 justify-end hairline-b hairline-r border-border p-2 last:border-r-0"
							>
								<div className={cn(BAR, 'h-3 w-5 rounded-sm')} />
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

/** The timesheet of the calendar page: the filter row, then the selection toolbar and the list inside one surface. */
export const SetupTimeSheetSkeleton: FC<SkeletonProps> = ({ className }) => {
	return (
		<div className={cn('-mx-2 flex flex-col overflow-hidden px-2 py-8', className)}>
			<div className="flex w-full flex-col">
				<div className="h-px w-full bg-border" />
				<div className="flex h-28 w-full items-center justify-between gap-3 p-2">
					<div className={cn(BAR, 'h-8 w-1/4')} />
					<div className="flex items-center justify-end gap-2 p-2">
						<div className={cn(BAR, 'h-8 w-44')} />
						<div className={cn(BAR, 'h-8 w-72')} />
						<div className={cn(BAR, 'h-8 w-24')} />
					</div>
				</div>
			</div>
			<div className="flex h-[780px] flex-col overflow-hidden rounded-xl bg-card p-4 hairline-ring ring-border shadow-sm shadow-black/6.5">
				<div className="flex w-full items-center justify-between gap-x-4 pb-3">
					<div className="flex items-center gap-x-4">
						<div className={cn(BAR, 'h-4 w-28')} />
						<div className={cn(BAR, 'h-8 w-32')} />
						<div className={cn(BAR, 'h-8 w-24')} />
					</div>
					<div className="flex h-6 gap-x-2">
						<div className={cn(BAR, 'h-6 w-20')} />
						<div className={cn(BAR, 'h-6 w-24')} />
						<div className={cn(BAR, 'h-6 w-24')} />
					</div>
				</div>
				<TimesheetViewSkeleton />
			</div>
		</div>
	);
};

export const AddManualTimeModalSkeleton: FC<SkeletonProps> = ({ className }) => {
	const fieldKeys = Array.from({ length: MODAL_FIELDS }, (_, index) => index);
	return (
		<div className={cn('fixed inset-0 z-[1000] flex items-center justify-center p-4', className)}>
			<div className="fixed inset-0 bg-black/20" />
			<div className="relative flex w-full max-w-lg flex-col gap-4 rounded-[16px] surface-raised p-5">
				<div className="flex items-center gap-2 pr-9">
					<div className={cn(BAR, 'h-5 w-20')} />
					<div className={cn(BAR, 'h-4 w-24')} />
				</div>
				<div className="flex flex-col gap-2">
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
						<div className="col-span-2 space-y-1.5 sm:col-span-1">
							<div className={cn(BAR, 'h-3 w-12')} />
							<div className={cn(BAR, 'h-9 w-full')} />
						</div>
						<div className="space-y-1.5">
							<div className={cn(BAR, 'h-3 w-16')} />
							<div className={cn(BAR, 'h-9 w-full')} />
						</div>
						<div className="space-y-1.5">
							<div className={cn(BAR, 'h-3 w-16')} />
							<div className={cn(BAR, 'h-9 w-full')} />
						</div>
					</div>
					<div className="h-9 rounded-lg bg-foreground/[0.03]" />
				</div>
				{fieldKeys.map((key) => (
					<div key={key} className="space-y-1.5">
						<div className={cn(BAR, 'h-3 w-20')} />
						<div className={cn(BAR, 'h-9 w-full')} />
					</div>
				))}
				<div className="flex items-center justify-between gap-3 pt-1">
					<div className={cn(BAR, 'h-5 w-24')} />
					<div className={cn(BAR, 'h-8 w-24 rounded-full')} />
				</div>
			</div>
		</div>
	);
};

export default {
	SetupFullCalendarSkeleton,
	SetupTimeSheetSkeleton,
	AddManualTimeModalSkeleton
};
