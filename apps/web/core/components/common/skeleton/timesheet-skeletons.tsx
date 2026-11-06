import { FC } from 'react';
import { clsxm } from '@/core/lib/utils';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const CALENDAR_DAY_HEADERS = 7;

const CALENDAR_DAY_CELLS = 35;

const TIMESHEET_GROUPS = 2;

const TIMESHEET_ROWS_PER_GROUP = 5;

const STATUS_CHIP_WIDTHS = ['w-24', 'w-20', 'w-24', 'w-24', 'w-16', 'w-24'];

const PAGINATION_STEPS = 6;

interface TimesheetSkeletonProps {
	className?: string;
}

/** The month grid of the timesheet calendar view: a hairline grid, one bar for each day number. */
export const CalendarViewSkeleton: FC<TimesheetSkeletonProps> = ({ className }) => {
	const headerKeys = Array.from({ length: CALENDAR_DAY_HEADERS }, (_, index) => index);
	const cellKeys = Array.from({ length: CALENDAR_DAY_CELLS }, (_, index) => index);
	return (
		<div className={clsxm('h-full w-full grow p-4', className)}>
			<div className="mb-4 flex items-center justify-between">
				<div className={clsxm(BAR, 'h-5 w-32')} />
				<div className="flex gap-2">
					<div className={clsxm(BAR, 'size-8')} />
					<div className={clsxm(BAR, 'size-8')} />
				</div>
			</div>
			<div className="overflow-hidden rounded-lg hairline-border border-border">
				<div className="grid grid-cols-7 hairline-divide-x divide-border hairline-b border-border">
					{headerKeys.map((key) => (
						<div key={key} className="flex h-9 items-center justify-center">
							<div className={clsxm(BAR, 'h-3 w-8')} />
						</div>
					))}
				</div>
				<div className="grid grid-cols-7">
					{cellKeys.map((key) => (
						<div key={key} className="min-h-24 hairline-b hairline-r border-border p-2 last:border-r-0">
							<div className={clsxm(BAR, 'h-3 w-5 rounded-sm')} />
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

function TimesheetEntryRowSkeleton() {
	return (
		<div className="flex min-h-14 items-center gap-4 hairline-t border-border px-4 py-2">
			<div className={clsxm(BAR, 'size-4 shrink-0 rounded-sm')} />
			<div className="flex min-w-0 flex-2 items-center gap-2">
				<div className={clsxm(BAR, 'size-5 shrink-0 rounded-sm')} />
				<div className={clsxm(BAR, 'h-4 w-12')} />
				<div className={clsxm(BAR, 'h-4 w-full max-w-72')} />
			</div>
			<div className="flex-1">
				<div className={clsxm(BAR, 'h-4 w-24')} />
			</div>
			<div className="flex flex-1 items-center gap-2">
				<div className={clsxm(BAR, 'size-7 shrink-0 rounded-full')} />
				<div className={clsxm(BAR, 'h-4 w-24')} />
			</div>
			<div className="flex-1">
				<div className={clsxm(BAR, 'h-6 w-20')} />
			</div>
			<div className="flex w-24 shrink-0 justify-end">
				<div className={clsxm(BAR, 'h-4 w-16')} />
			</div>
		</div>
	);
}

function TimesheetGroupSkeleton() {
	const rowKeys = Array.from({ length: TIMESHEET_ROWS_PER_GROUP }, (_, index) => index);
	return (
		<div>
			<div className="flex h-10 w-full items-center justify-between gap-3 bg-foreground/2.5 px-4">
				<div className={clsxm(BAR, 'h-4 w-32')} />
				<div className={clsxm(BAR, 'h-4 w-20')} />
			</div>
			<div className="flex h-11 w-full items-center justify-between gap-3 hairline-t border-border px-4">
				<div className="flex items-center gap-2">
					<div className={clsxm(BAR, 'h-6 w-24 rounded-full')} />
					<div className={clsxm(BAR, 'h-6 w-28 rounded-full')} />
				</div>
				<div className="flex items-center gap-1">
					<div className={clsxm(BAR, 'h-7 w-20')} />
					<div className={clsxm(BAR, 'h-7 w-20')} />
				</div>
			</div>
			<div className="flex h-9 w-full items-center gap-4 hairline-t border-border bg-foreground/2.5 px-4">
				<div className={clsxm(BAR, 'size-4 shrink-0 rounded-sm')} />
				<div className="min-w-0 flex-2">
					<div className={clsxm(BAR, 'h-3 w-12')} />
				</div>
				<div className="flex-1">
					<div className={clsxm(BAR, 'h-3 w-16')} />
				</div>
				<div className="flex-1">
					<div className={clsxm(BAR, 'h-3 w-20')} />
				</div>
				<div className="flex-1">
					<div className={clsxm(BAR, 'h-3 w-14')} />
				</div>
				<div className="flex w-24 shrink-0 justify-end">
					<div className={clsxm(BAR, 'h-3 w-10')} />
				</div>
			</div>
			{rowKeys.map((key) => (
				<TimesheetEntryRowSkeleton key={key} />
			))}
		</div>
	);
}

/** The timesheet list: a date row, a status row, the column labels and the entries, split by hairlines. */
export const TimesheetViewSkeleton: FC<TimesheetSkeletonProps> = ({ className }) => {
	const groupKeys = Array.from({ length: TIMESHEET_GROUPS }, (_, index) => index);
	return (
		<div className={clsxm('h-full w-full grow hairline-divide-y divide-border', className)}>
			{groupKeys.map((key) => (
				<TimesheetGroupSkeleton key={key} />
			))}
		</div>
	);
};

export const TimesheetDetailModalSkeleton: FC<TimesheetSkeletonProps> = ({ className }) => {
	const statKeys = [0, 1, 2];
	const entryKeys = [0, 1, 2, 3, 4];
	return (
		<div className={clsxm('fixed inset-0 z-[1000] flex items-center justify-center bg-black/40', className)}>
			<div className="mx-4 max-h-[90vh] w-full max-w-[35rem] overflow-hidden rounded-2xl bg-card hairline-ring ring-border shadow-xl shadow-black/6.5">
				<div className="flex items-center justify-between hairline-b border-border p-6">
					<div className={clsxm(BAR, 'h-6 w-48')} />
					<div className={clsxm(BAR, 'size-8')} />
				</div>
				<div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
					<div className="grid grid-cols-3 gap-4">
						{statKeys.map((key) => (
							<div key={key} className="rounded-lg bg-foreground/[0.03] p-4">
								<div className={clsxm(BAR, 'mb-2 h-8 w-16')} />
								<div className={clsxm(BAR, 'h-4 w-24')} />
							</div>
						))}
					</div>
					<div className="space-y-4">
						{entryKeys.map((key) => (
							<div key={key} className="rounded-lg bg-foreground/[0.03] p-4">
								<div className="mb-2 flex items-center justify-between">
									<div className={clsxm(BAR, 'h-4 w-32')} />
									<div className={clsxm(BAR, 'h-4 w-16')} />
								</div>
								<div className="space-y-2">
									<div className={clsxm(BAR, 'h-3 w-full')} />
									<div className={clsxm(BAR, 'h-3 w-3/4')} />
								</div>
							</div>
						))}
					</div>
				</div>
				<div className="flex justify-end gap-2 hairline-t border-border p-6">
					<div className={clsxm(BAR, 'h-9 w-20')} />
					<div className={clsxm(BAR, 'h-9 w-24')} />
				</div>
			</div>
		</div>
	);
};

/** The toolbar rows of the timesheet page: the title with its controls, then the status chips. */
export const TimesheetFilterSkeleton: FC<TimesheetSkeletonProps> = ({ className }) => {
	return (
		<div className={clsxm('w-full', className)}>
			<div className="flex flex-wrap items-center justify-between gap-3 py-3">
				<div className={clsxm(BAR, 'h-5 w-28')} />
				<div className="ml-auto flex flex-wrap items-center gap-2">
					<div className={clsxm(BAR, 'h-8 w-28')} />
					<div className={clsxm(BAR, 'h-8 w-56')} />
					<div className={clsxm(BAR, 'h-8 w-24')} />
					<div className={clsxm(BAR, 'h-8 w-28')} />
				</div>
			</div>
			<div className="flex w-fit max-w-full gap-x-1 overflow-x-auto pb-3 no-scrollbar">
				{STATUS_CHIP_WIDTHS.map((width, index) => (
					<div key={index} className={clsxm(BAR, 'h-7 shrink-0 rounded-full', width)} />
				))}
			</div>
		</div>
	);
};

/** One tile of the timesheet strip; the strip surface belongs to the page. */
export const TimesheetCardSkeleton: FC<TimesheetSkeletonProps> = ({ className }) => {
	return (
		<div className={clsxm('flex min-w-0 flex-1 items-start gap-3 p-4', className)}>
			<div className={clsxm(BAR, 'size-9 shrink-0 rounded-lg')} />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex h-4 items-center">
					<div className={clsxm(BAR, 'h-3 w-24')} />
				</div>
				<div className="flex h-8 items-center">
					<div className={clsxm(BAR, 'h-6 w-20')} />
				</div>
				<div className="flex h-4 items-center">
					<div className={clsxm(BAR, 'h-3 w-32')} />
				</div>
				<div className={clsxm(BAR, 'mt-1 h-8 w-28')} />
			</div>
		</div>
	);
};

/** The timesheet pagination row under the list, on a hairline. */
export const TimesheetPaginationSkeleton: FC<TimesheetSkeletonProps> = ({ className }) => {
	const stepKeys = Array.from({ length: PAGINATION_STEPS }, (_, index) => index);
	return (
		<div
			className={clsxm(
				'flex w-full flex-row items-center justify-between gap-4 hairline-t border-border px-4 py-3',
				className
			)}
		>
			<div className={clsxm(BAR, 'h-3 w-32')} />
			<div className="flex w-full justify-end">
				<div className="flex items-center justify-start gap-x-3 pr-2">
					<div className={clsxm(BAR, 'h-3 w-20')} />
					<div className={clsxm(BAR, 'h-8 w-20')} />
					<div className={clsxm(BAR, 'h-3 w-20')} />
				</div>
				<div className="flex gap-1">
					{stepKeys.map((key) => (
						<div key={key} className={clsxm(BAR, 'size-8')} />
					))}
				</div>
			</div>
		</div>
	);
};
