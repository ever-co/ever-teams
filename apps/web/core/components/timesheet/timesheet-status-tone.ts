import type { BadgeProps } from '@/core/components/common/badge';

type TimesheetStatusTone = NonNullable<BadgeProps['variant']>;

const TONE_BY_TIMESHEET_STATUS: Record<string, TimesheetStatusTone> = {
	DRAFT: 'secondary',
	PENDING: 'warning',
	'IN REVIEW': 'info',
	DENIED: 'destructive',
	APPROVED: 'success'
};

const DOT_CLASS_BY_TONE: Record<TimesheetStatusTone, string> = {
	default: 'bg-primary',
	secondary: 'bg-muted-foreground',
	outline: 'bg-muted-foreground',
	success: 'bg-success',
	warning: 'bg-warning',
	info: 'bg-info',
	destructive: 'bg-destructive'
};

export function timesheetStatusTone(status?: string | null): TimesheetStatusTone {
	if (!status) {
		return 'secondary';
	}
	return TONE_BY_TIMESHEET_STATUS[status] ?? 'secondary';
}

const ACCENT_CLASS_BY_TONE: Record<TimesheetStatusTone, string> = {
	default: 'border-l-primary',
	secondary: 'border-l-muted-foreground/40',
	outline: 'border-l-border',
	success: 'border-l-success',
	warning: 'border-l-warning',
	info: 'border-l-info',
	destructive: 'border-l-destructive'
};

export function timesheetStatusDotClass(status?: string | null): string {
	const tone = timesheetStatusTone(status);
	return DOT_CLASS_BY_TONE[tone];
}

export function timesheetStatusAccentClass(status?: string | null): string {
	const tone = timesheetStatusTone(status);
	return ACCENT_CLASS_BY_TONE[tone];
}

export function timesheetStatusLabel<T extends string | null | undefined>(status: T) {
	if (status === 'DENIED') {
		return 'REJECTED';
	}
	return status;
}
