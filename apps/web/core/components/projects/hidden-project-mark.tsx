'use client';

import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Lock } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

const TOOLTIP_DELAY_MS = 300;

interface HiddenProjectMarkProps {
	/** Whether the mark takes focus of its own; inside a control that holds the focus it does not. */
	isFocusable?: boolean;
	className?: string;
}

/**
 * The lock of private projects, in place of the tile of a project the API keeps from the caller (CORE-27): the time
 * and the task belong to a private project they are not on. It tells so on hover and on focus, and assistive
 * technology reads the same sentence.
 */
export function HiddenProjectMark({ isFocusable = true, className }: Readonly<HiddenProjectMarkProps>) {
	const t = useTranslations();
	const hint = t('common.PRIVATE_PROJECT_HINT');
	return (
		<Tooltip>
			<TooltipTrigger asChild delay={TOOLTIP_DELAY_MS}>
				<span
					tabIndex={isFocusable ? 0 : undefined}
					role="img"
					aria-label={hint}
					className={cn(
						'inline-flex size-4 shrink-0 items-center justify-center rounded-[28%] bg-foreground/[0.06] text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-3',
						className
					)}
				>
					<Lock aria-hidden />
				</span>
			</TooltipTrigger>
			<TooltipContent>{hint}</TooltipContent>
		</Tooltip>
	);
}

/**
 * A record's project the API keeps from the reader, named as one: the lock, then "Private project".
 * `isFocusable={false}` inside a control (a row toggle, a button): the lock then leaves the focus to it.
 */
export function HiddenProjectName({
	label,
	className,
	isFocusable = true
}: Readonly<{ label: string; className?: string; isFocusable?: boolean }>) {
	return (
		<span className={cn('flex min-w-0 items-center gap-1.5 text-foreground', className)}>
			<HiddenProjectMark isFocusable={isFocusable} />
			<span className="truncate">{label}</span>
		</span>
	);
}
