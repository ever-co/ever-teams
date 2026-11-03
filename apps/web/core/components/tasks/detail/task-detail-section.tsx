'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from '@/core/components/icons';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { cn } from '@/core/lib/helpers';
import { DETAIL_SECTION_COUNT, DETAIL_SECTION_TITLE } from './task-detail-recipes';

interface TaskDetailSectionProps {
	title: string;
	/** A figure written after the title: a count, a progress, a total. */
	meta?: ReactNode;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
}

export function TaskDetailSection({ title, meta, actions, children, className }: Readonly<TaskDetailSectionProps>) {
	const titleId = useId();
	return (
		<section aria-labelledby={titleId} className={cn('flex flex-col gap-2.5', className)}>
			<div className="flex min-h-7 items-center gap-2.5">
				<h2 id={titleId} className={DETAIL_SECTION_TITLE}>
					{title}
				</h2>
				{meta && <span className={DETAIL_SECTION_COUNT}>{meta}</span>}
				{actions && <span className="ml-auto flex shrink-0 items-center gap-1">{actions}</span>}
			</div>
			{children}
		</section>
	);
}

interface TaskDetailRailSectionProps {
	title: string;
	meta?: ReactNode;
	actions?: ReactNode;
	defaultOpen?: boolean;
	children: ReactNode;
}

export function TaskDetailRailSection({
	title,
	meta,
	actions,
	defaultOpen = true,
	children
}: Readonly<TaskDetailRailSectionProps>) {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	const contentId = useId();
	return (
		<section className="flex flex-col px-4 py-3">
			<div className="flex h-7 items-center gap-1">
				<button
					type="button"
					aria-expanded={isOpen}
					aria-controls={contentId}
					onClick={() => setIsOpen((open) => !open)}
					className="-ml-1.5 inline-flex h-7 min-w-0 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
				>
					<span className="truncate">{title}</span>
					<ChevronDown
						aria-hidden="true"
						className={cn('size-3 shrink-0 transition-transform duration-200', !isOpen && '-rotate-90')}
					/>
				</button>
				{meta && <span className="text-xs tabular-nums text-muted-foreground">{meta}</span>}
				{actions && <span className="ml-auto flex shrink-0 items-center gap-1">{actions}</span>}
			</div>
			<AnimatedHeight swapKey={String(isOpen)}>
				{isOpen && (
					<div id={contentId} className="pt-1.5">
						{children}
					</div>
				)}
			</AnimatedHeight>
		</section>
	);
}
