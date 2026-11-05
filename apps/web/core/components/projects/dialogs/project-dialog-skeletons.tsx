import { cn } from '@/core/lib/helpers';
import { PROJECT_DIALOG_BODY, PROJECT_DIALOG_FOOTER } from './project-dialog';

const BAR = 'animate-pulse rounded-full bg-foreground/[0.06]';

const PROPERTY_VALUE_WIDTHS = ['w-24', 'w-40', 'w-32', 'w-44', 'w-36', 'w-20', 'w-28', 'w-48'];

function PropertyRowSkeleton({ valueWidth }: Readonly<{ valueWidth: string }>) {
	return (
		<div className="grid min-h-9 grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
			<span className="flex items-center gap-2">
				<span className="size-4 animate-pulse rounded-[5px] bg-foreground/[0.06]" />
				<span className={cn(BAR, 'h-2.5 w-16')} />
			</span>
			<span className={cn(BAR, 'h-3', valueWidth)} />
		</div>
	);
}

export function ProjectComposerSkeleton() {
	return (
		<output aria-busy="true" className="flex min-h-0 flex-1 flex-col">
			<div className="flex h-13 shrink-0 items-center gap-2 pl-5">
				<span className={cn(BAR, 'h-6 w-24 rounded-md')} />
				<span className={cn(BAR, 'h-3 w-20')} />
			</div>
			<div className={cn(PROJECT_DIALOG_BODY, 'pb-5')}>
				<div className="flex items-center gap-3 pt-1">
					<span className="size-11 animate-pulse rounded-[12px] bg-foreground/[0.06]" />
					<span className={cn(BAR, 'h-5 w-56')} />
				</div>
				<div className="flex flex-col gap-2 pt-4">
					<span className={cn(BAR, 'h-3 w-3/4')} />
					<span className={cn(BAR, 'h-3 w-1/2')} />
				</div>
				<div className="mt-6 hairline-t border-border pt-2">
					{PROPERTY_VALUE_WIDTHS.map((width) => (
						<PropertyRowSkeleton key={width} valueWidth={width} />
					))}
				</div>
			</div>
			<div className={PROJECT_DIALOG_FOOTER}>
				<span className={cn(BAR, 'mr-auto h-3 w-28')} />
				<span className={cn(BAR, 'h-8 w-16')} />
				<span className={cn(BAR, 'h-8 w-28')} />
			</div>
		</output>
	);
}

export function ProjectInfoSheetSkeleton() {
	return (
		<output aria-busy="true" className="flex h-full min-h-0 flex-col">
			<div className="flex h-12 shrink-0 items-center gap-2 hairline-b border-border px-4">
				<span className={cn(BAR, 'h-6 w-24 rounded-md')} />
				<span className={cn(BAR, 'ml-auto h-7 w-24')} />
			</div>
			<div className="flex items-center gap-3 px-5 py-5">
				<span className="size-11 animate-pulse rounded-[12px] bg-foreground/[0.06]" />
				<span className="flex flex-col gap-2">
					<span className={cn(BAR, 'h-4 w-48')} />
					<span className={cn(BAR, 'h-3 w-28')} />
				</span>
			</div>
			<div className="flex flex-col px-5">
				{PROPERTY_VALUE_WIDTHS.slice(0, 6).map((width) => (
					<PropertyRowSkeleton key={width} valueWidth={width} />
				))}
			</div>
			<div className="flex flex-col gap-2 px-5 pt-6">
				<span className={cn(BAR, 'h-3 w-full')} />
				<span className={cn(BAR, 'h-3 w-5/6')} />
				<span className={cn(BAR, 'h-3 w-2/3')} />
			</div>
		</output>
	);
}
