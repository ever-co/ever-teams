'use client';

import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

/** The "Show # more" / "Show fewer" button under a capped list; the list itself opens through `AnimatedHeight`. */
export function FoldToggle({
	label,
	isExpanded,
	onToggle,
	className
}: Readonly<{ label: string; isExpanded: boolean; onToggle: () => void; className?: string }>) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			aria-expanded={isExpanded}
			onClick={onToggle}
			className={cn('-ml-2.5 text-muted-foreground', className)}
		>
			{label}
			<ChevronDown
				aria-hidden="true"
				className={cn('size-3.5 transition-transform duration-200', isExpanded && 'rotate-180')}
			/>
		</Button>
	);
}
