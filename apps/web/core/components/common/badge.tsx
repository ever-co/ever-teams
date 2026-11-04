import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/core/lib/helpers';

/**
 * Soft pairs only: a status fill with white text is never used on a badge.
 * Over `chip-3d`, the text keeps the measured ink of each pair.
 */
const badgeVariants = cva(
	"inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
	{
		variants: {
			variant: {
				default: 'chip-3d text-primary-ink [--chip:hsl(var(--primary))]',
				secondary: 'chip-3d text-muted-foreground [--chip:hsl(var(--muted-foreground))]',
				destructive: 'chip-3d text-destructive-ink [--chip:hsl(var(--destructive))]',
				outline: 'bg-card text-foreground hairline-ring ring-border',
				success: 'chip-3d text-success-foreground [--chip:hsl(var(--success))]',
				warning: 'chip-3d text-warning-foreground [--chip:hsl(var(--warning))]',
				info: 'chip-3d text-info-foreground [--chip:hsl(var(--info))]'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	}
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return <div data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
