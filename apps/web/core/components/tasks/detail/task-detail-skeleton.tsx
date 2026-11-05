import { cn } from '@/core/lib/helpers';

const BAR = 'animate-pulse rounded-full bg-foreground/[0.06]';

const BOX = 'animate-pulse rounded-xl bg-foreground/[0.04]';

const PROPERTY_ROW_KEYS = ['status', 'priority', 'size', 'type', 'people', 'labels', 'project', 'version'];

const RAIL_ROW_KEYS = [
	'status',
	'priority',
	'size',
	'type',
	'people',
	'labels',
	'project',
	'version',
	'parent',
	'start',
	'due',
	'visibility'
];

function PropertyRowSkeleton() {
	return (
		<div className="grid min-h-8 grid-cols-[6.75rem_minmax(0,1fr)] items-center gap-x-2">
			<span className="flex items-center gap-2">
				<span className="size-4 shrink-0 rounded-[5px] bg-foreground/[0.06]" />
				<span className={cn('h-2.5 w-14', BAR)} />
			</span>
			<span className={cn('h-6 w-24 rounded-md', BAR)} />
		</div>
	);
}

export function TaskDetailSectionSkeleton() {
	return (
		<output className="flex flex-col gap-2.5">
			<span className={cn('h-3 w-24', BAR)} />
			<div className={cn('h-20', BOX)} />
		</output>
	);
}

function TitleSkeleton() {
	return (
		<div className="flex flex-col gap-2.5">
			<span className={cn('h-3 w-40', BAR)} />
			<span className={cn('h-6 w-3/4', BAR)} />
		</div>
	);
}

export function TaskDetailColumnSkeleton() {
	return (
		<output className="flex flex-col gap-8 px-6 pt-6 pb-8 sm:px-7">
			<TitleSkeleton />
			<div className="@container">
				<div className="grid gap-x-6 @2xl:grid-cols-2">
					{PROPERTY_ROW_KEYS.map((key) => (
						<PropertyRowSkeleton key={key} />
					))}
				</div>
			</div>
			<div className={cn('h-24', BOX)} />
			<TaskDetailSectionSkeleton />
		</output>
	);
}

export function TaskDetailPageSkeleton() {
	return (
		<output className="absolute inset-0 flex">
			<div className="min-w-0 flex-1 overflow-hidden">
				<div className="mx-auto flex w-full max-w-[46rem] flex-col gap-8 px-5 py-8 sm:px-8">
					<span className={cn('h-7 w-3/4', BAR)} />
					<span className={cn('h-3 w-56', BAR)} />
					<div className={cn('h-32', BOX)} />
					<TaskDetailSectionSkeleton />
					<TaskDetailSectionSkeleton />
				</div>
			</div>
			<div className="hidden w-[20rem] shrink-0 flex-col gap-1 hairline-l border-border px-4 py-4 lg:flex xl:w-[22rem]">
				<span className={cn('mb-2 h-2.5 w-20', BAR)} />
				{RAIL_ROW_KEYS.map((key) => (
					<PropertyRowSkeleton key={key} />
				))}
			</div>
		</output>
	);
}

export function TaskDetailBandSkeleton() {
	return (
		<div className="flex h-11 items-center gap-2 px-4" aria-hidden="true">
			<span className="size-7 shrink-0 rounded-md bg-foreground/[0.05]" />
			<span className={cn('h-3 w-16', BAR)} />
			<span className="flex-1" />
			<span className="size-8 shrink-0 rounded-full bg-foreground/[0.05]" />
			<span className={cn('h-3 w-12', BAR)} />
			<span className="size-7 shrink-0 rounded-md bg-foreground/[0.05]" />
			<span className="size-7 shrink-0 rounded-md bg-foreground/[0.05]" />
			<span className="size-7 shrink-0 rounded-md bg-foreground/[0.05]" />
		</div>
	);
}
