import type { ReactNode } from 'react';
import { Badge } from '@/core/components/common/badge';
import { cn } from '@/core/lib/helpers';
import { timesheetStatusDotClass, timesheetStatusTone } from './timesheet-status-tone';

interface TimesheetStatusBadgeProps {
	status?: string | null;
	children: ReactNode;
	className?: string;
}

export function TimesheetStatusBadge({ status, children, className }: TimesheetStatusBadgeProps) {
	const tone = timesheetStatusTone(status);
	const dotClass = timesheetStatusDotClass(status);
	return (
		<Badge variant={tone} className={cn('h-6 gap-1.5 py-0', className)}>
			<span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', dotClass)} />
			{children}
		</Badge>
	);
}

interface TimesheetTotalBadgeProps {
	label: ReactNode;
	children: ReactNode;
	className?: string;
}

export function TimesheetTotalBadge({ label, children, className }: TimesheetTotalBadgeProps) {
	return (
		<Badge variant="outline" className={cn('gap-1.5 tabular-nums', className)}>
			<span className="text-muted-foreground">{label}</span>
			{children}
		</Badge>
	);
}
