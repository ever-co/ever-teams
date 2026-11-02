import type { ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';

export function TaskPropertyRow({
	icon,
	label,
	children,
	alignTop = false,
	className
}: Readonly<{ icon: ReactNode; label: string; children: ReactNode; alignTop?: boolean; className?: string }>) {
	return (
		<div
			className={cn(
				'grid min-h-8 grid-cols-[6.75rem_minmax(0,1fr)] gap-x-2',
				alignTop && 'items-start',
				!alignTop && 'items-center',
				className
			)}
		>
			<span className="flex h-8 min-w-0 items-center gap-2 text-[13px] text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0">
				<span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>
				<span className="truncate">{label}</span>
			</span>
			<div className="flex min-h-8 min-w-0 flex-wrap items-center gap-1.5 py-0.5">{children}</div>
		</div>
	);
}
